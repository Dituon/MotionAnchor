use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicBool, AtomicU32, Ordering},
    mpsc, Arc, Mutex,
};
use tauri::{AppHandle, Emitter};

use crate::settings_store;

const RAW_MOUSE_EVENT: &str = "raw-mouse";
const RAW_MOUSE_STATUS_EVENT: &str = "raw-mouse-status";
const DEFAULT_REFRESH_RATE_HZ: u32 = 120;
const MIN_REFRESH_RATE_HZ: u32 = 1;
const MAX_REFRESH_RATE_HZ: u32 = 1000;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMouseSettingsPayload {
    max_refresh_rate_hz: Option<u32>,
    default_refresh_rate_hz: u32,
    effective_refresh_rate_hz: u32,
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawMouseSettingsStore {
    max_refresh_rate_hz: Option<u32>,
}

#[derive(Clone)]
struct RawMouseSettingsState {
    max_refresh_rate_hz: Option<u32>,
    effective_refresh_rate_hz: u32,
    initialized: bool,
}

impl Default for RawMouseSettingsState {
    fn default() -> Self {
        Self {
            max_refresh_rate_hz: None,
            effective_refresh_rate_hz: DEFAULT_REFRESH_RATE_HZ,
            initialized: false,
        }
    }
}

impl From<&RawMouseSettingsState> for RawMouseSettingsPayload {
    fn from(settings: &RawMouseSettingsState) -> Self {
        Self {
            max_refresh_rate_hz: settings.max_refresh_rate_hz,
            default_refresh_rate_hz: DEFAULT_REFRESH_RATE_HZ,
            effective_refresh_rate_hz: settings.effective_refresh_rate_hz,
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RawMousePayload {
    device_id: usize,
    dx: i32,
    dy: i32,
    dt_ms: f64,
    speed: f64,
    acceleration: f64,
    timestamp_ms: u128,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RawMouseStatusPayload {
    status: &'static str,
    message: String,
}

pub struct RawInputState {
    worker: Mutex<Option<RawInputWorker>>,
    settings: Mutex<RawMouseSettingsState>,
    effective_refresh_rate_hz: Arc<AtomicU32>,
}

impl Default for RawInputState {
    fn default() -> Self {
        Self {
            worker: Mutex::new(None),
            settings: Mutex::new(RawMouseSettingsState::default()),
            effective_refresh_rate_hz: Arc::new(AtomicU32::new(DEFAULT_REFRESH_RATE_HZ)),
        }
    }
}

struct RawInputWorker {
    stop: Arc<AtomicBool>,
}

impl Drop for RawInputWorker {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
    }
}

impl RawInputState {
    pub fn is_enabled(&self) -> bool {
        self.worker
            .lock()
            .map(|worker| worker.is_some())
            .unwrap_or(false)
    }

    pub fn start(&self, app: AppHandle) -> Result<bool, String> {
        self.ensure_settings(&app)?;

        let mut worker = self.worker.lock().map_err(|error| error.to_string())?;

        if worker.is_some() {
            return Ok(true);
        }

        match start_raw_mouse_worker(app, Arc::clone(&self.effective_refresh_rate_hz)) {
            Ok(next_worker) => {
                *worker = Some(next_worker);
                Ok(true)
            }
            Err(error) => {
                *worker = None;
                Err(error)
            }
        }
    }

    pub fn stop(&self) -> bool {
        let stopped = self
            .worker
            .lock()
            .map(|mut worker| worker.take().is_some())
            .unwrap_or(false);

        stopped
    }

    pub fn settings(&self, app: &AppHandle) -> Result<RawMouseSettingsPayload, String> {
        self.ensure_settings(app)?;
        self.settings
            .lock()
            .map(|settings| RawMouseSettingsPayload::from(&*settings))
            .map_err(|error| error.to_string())
    }

    pub fn set_settings(
        &self,
        app: &AppHandle,
        max_refresh_rate_hz: Option<u32>,
    ) -> Result<RawMouseSettingsPayload, String> {
        if let Some(refresh_rate) = max_refresh_rate_hz {
            validate_refresh_rate(refresh_rate)?;
        }

        let next_settings = make_settings_state(max_refresh_rate_hz, true);
        write_settings_store(
            app,
            &RawMouseSettingsStore {
                max_refresh_rate_hz,
            },
        )?;
        self.apply_settings(next_settings)
    }

    fn ensure_settings(&self, app: &AppHandle) -> Result<(), String> {
        let initialized = self
            .settings
            .lock()
            .map(|settings| settings.initialized)
            .map_err(|error| error.to_string())?;

        if initialized {
            return Ok(());
        }

        let store = read_settings_store(app)?;
        let settings = make_settings_state(store.max_refresh_rate_hz, true);
        self.apply_settings(settings).map(|_| ())
    }

    fn apply_settings(
        &self,
        settings: RawMouseSettingsState,
    ) -> Result<RawMouseSettingsPayload, String> {
        self.effective_refresh_rate_hz
            .store(settings.effective_refresh_rate_hz, Ordering::Relaxed);

        let payload = RawMouseSettingsPayload::from(&settings);
        let mut current = self.settings.lock().map_err(|error| error.to_string())?;
        *current = settings;
        Ok(payload)
    }
}

#[tauri::command]
pub fn get_raw_mouse_enabled(state: tauri::State<'_, RawInputState>) -> bool {
    state.is_enabled()
}

#[tauri::command]
pub fn set_raw_mouse_enabled(
    app: AppHandle,
    state: tauri::State<'_, RawInputState>,
    enabled: bool,
) -> Result<bool, String> {
    if enabled {
        state.start(app)
    } else {
        state.stop();
        Ok(false)
    }
}

#[tauri::command]
pub fn get_raw_mouse_settings(
    app: AppHandle,
    state: tauri::State<'_, RawInputState>,
) -> Result<RawMouseSettingsPayload, String> {
    state.settings(&app)
}

#[tauri::command]
pub fn set_raw_mouse_settings(
    app: AppHandle,
    state: tauri::State<'_, RawInputState>,
    max_refresh_rate_hz: Option<u32>,
) -> Result<RawMouseSettingsPayload, String> {
    state.set_settings(&app, max_refresh_rate_hz)
}

fn validate_refresh_rate(refresh_rate_hz: u32) -> Result<(), String> {
    if (MIN_REFRESH_RATE_HZ..=MAX_REFRESH_RATE_HZ).contains(&refresh_rate_hz) {
        Ok(())
    } else {
        Err(format!(
            "Refresh rate must be between {} and {} Hz",
            MIN_REFRESH_RATE_HZ, MAX_REFRESH_RATE_HZ
        ))
    }
}

fn clamp_refresh_rate(refresh_rate_hz: u32) -> u32 {
    refresh_rate_hz.clamp(MIN_REFRESH_RATE_HZ, MAX_REFRESH_RATE_HZ)
}

fn make_settings_state(
    max_refresh_rate_hz: Option<u32>,
    initialized: bool,
) -> RawMouseSettingsState {
    let normalized_max = max_refresh_rate_hz.map(clamp_refresh_rate);

    RawMouseSettingsState {
        max_refresh_rate_hz: normalized_max,
        effective_refresh_rate_hz: normalized_max.unwrap_or(DEFAULT_REFRESH_RATE_HZ),
        initialized,
    }
}

fn read_settings_store(app: &AppHandle) -> Result<RawMouseSettingsStore, String> {
    settings_store::get(app, settings_store::RAW_INPUT_SETTINGS_KEY)
        .map(|settings| settings.unwrap_or_default())
}

fn write_settings_store(app: &AppHandle, store: &RawMouseSettingsStore) -> Result<(), String> {
    settings_store::set(app, settings_store::RAW_INPUT_SETTINGS_KEY, store)
}

#[cfg(target_os = "windows")]
fn start_raw_mouse_worker(
    app: AppHandle,
    effective_refresh_rate_hz: Arc<AtomicU32>,
) -> Result<RawInputWorker, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);
    let (init_tx, init_rx) = mpsc::channel();

    std::thread::Builder::new()
        .name("motion-anchor-raw-input".to_string())
        .spawn(move || {
            run_windows_raw_mouse_stream(app, thread_stop, init_tx, effective_refresh_rate_hz)
        })
        .map_err(|error| error.to_string())?;

    init_rx
        .recv()
        .map_err(|_| "Raw input worker stopped before initialization".to_string())??;

    Ok(RawInputWorker { stop })
}

#[cfg(not(target_os = "windows"))]
fn start_raw_mouse_worker(
    app: AppHandle,
    _effective_refresh_rate_hz: Arc<AtomicU32>,
) -> Result<RawInputWorker, String> {
    let _ = app.emit_to(
        "main",
        RAW_MOUSE_STATUS_EVENT,
        RawMouseStatusPayload {
            status: "unsupported",
            message: "multiinput raw mouse prototype is Windows-only".to_string(),
        },
    );

    Err("Raw mouse input is Windows-only".to_string())
}

#[cfg(target_os = "windows")]
#[derive(Default)]
struct PendingRawMousePayload {
    device_id: usize,
    dx: i32,
    dy: i32,
    count: u64,
    timestamp_ms: u128,
}

#[cfg(target_os = "windows")]
impl PendingRawMousePayload {
    fn add(&mut self, device_id: usize, dx: i32, dy: i32, timestamp_ms: u128) {
        self.device_id = device_id;
        self.dx = self.dx.saturating_add(dx);
        self.dy = self.dy.saturating_add(dy);
        self.count = self.count.saturating_add(1);
        self.timestamp_ms = timestamp_ms;
    }

    fn has_motion(&self) -> bool {
        self.count > 0 && (self.dx != 0 || self.dy != 0)
    }

    fn take(&mut self) -> Self {
        std::mem::take(self)
    }
}

#[cfg(target_os = "windows")]
fn refresh_interval(refresh_rate_hz: u32) -> std::time::Duration {
    std::time::Duration::from_secs_f64(1.0 / f64::from(clamp_refresh_rate(refresh_rate_hz)))
}

#[cfg(target_os = "windows")]
fn run_windows_raw_mouse_stream(
    app: AppHandle,
    stop: Arc<AtomicBool>,
    init_tx: mpsc::Sender<Result<(), String>>,
    effective_refresh_rate_hz: Arc<AtomicU32>,
) {
    use multiinput::{DeviceType, RawEvent, RawInputManager};
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    let mut manager = match RawInputManager::new() {
        Ok(manager) => manager,
        Err(error) => {
            let message = error.to_string();
            let _ = init_tx.send(Err(message.clone()));
            let _ = app.emit_to(
                "main",
                RAW_MOUSE_STATUS_EVENT,
                RawMouseStatusPayload {
                    status: "error",
                    message,
                },
            );
            return;
        }
    };

    manager.register_devices(DeviceType::Mice);
    let device_stats = manager.get_device_stats();
    let _ = init_tx.send(Ok(()));

    let _ = app.emit_to(
        "main",
        RAW_MOUSE_STATUS_EVENT,
        RawMouseStatusPayload {
            status: "listening",
            message: format!(
                "Windows Raw Input mouse stream started. Mice: {}",
                device_stats.number_of_mice
            ),
        },
    );

    let mut pending = PendingRawMousePayload::default();
    let mut last_emit = Instant::now();
    let mut last_sample = Instant::now();
    let mut last_speed = 0.0;

    while !stop.load(Ordering::Relaxed) {
        match manager.get_event() {
            Some(RawEvent::MouseMoveEvent(device_id, dx, dy)) => {
                let timestamp_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_millis())
                    .unwrap_or_default();
                pending.add(device_id, dx, dy, timestamp_ms);
            }
            Some(_) => {}
            None => {
                std::thread::sleep(Duration::from_millis(1));
            }
        }

        let refresh_rate_hz = clamp_refresh_rate(effective_refresh_rate_hz.load(Ordering::Relaxed));
        let now = Instant::now();
        if pending.has_motion()
            && now.duration_since(last_emit) >= refresh_interval(refresh_rate_hz)
        {
            let payload = pending.take();
            let dt = now.duration_since(last_sample).as_secs_f64().max(0.000_001);
            last_sample = now;
            last_emit = now;

            let distance = ((i64::from(payload.dx) * i64::from(payload.dx)
                + i64::from(payload.dy) * i64::from(payload.dy))
                as f64)
                .sqrt();
            let speed = distance / dt;
            let acceleration = (speed - last_speed) / dt;
            last_speed = speed;

            let _ = app.emit_to(
                "main",
                RAW_MOUSE_EVENT,
                RawMousePayload {
                    device_id: payload.device_id,
                    dx: payload.dx,
                    dy: payload.dy,
                    dt_ms: dt * 1000.0,
                    speed,
                    acceleration,
                    timestamp_ms: payload.timestamp_ms,
                },
            );
        }
    }

    let _ = app.emit_to(
        "main",
        RAW_MOUSE_STATUS_EVENT,
        RawMouseStatusPayload {
            status: "stopped",
            message: "Windows Raw Input mouse stream stopped".to_string(),
        },
    );
}
