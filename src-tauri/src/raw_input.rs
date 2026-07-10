use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Arc, Mutex,
};
use tauri::{AppHandle, Emitter};

const RAW_MOUSE_EVENT: &str = "raw-mouse";
const RAW_MOUSE_STATUS_EVENT: &str = "raw-mouse-status";

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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMouseDebugPayload {
    running: bool,
    status: String,
    message: String,
    mouse_count: usize,
    keyboard_count: usize,
    joystick_count: usize,
    poll_count: u64,
    empty_poll_count: u64,
    event_count: u64,
    last_event_at_ms: Option<u128>,
    last_dx: i32,
    last_dy: i32,
    last_speed: f64,
    last_acceleration: f64,
}

impl Default for RawMouseDebugPayload {
    fn default() -> Self {
        Self {
            running: false,
            status: "stopped".to_string(),
            message: "Raw input is stopped".to_string(),
            mouse_count: 0,
            keyboard_count: 0,
            joystick_count: 0,
            poll_count: 0,
            empty_poll_count: 0,
            event_count: 0,
            last_event_at_ms: None,
            last_dx: 0,
            last_dy: 0,
            last_speed: 0.0,
            last_acceleration: 0.0,
        }
    }
}

#[derive(Default)]
pub struct RawInputState {
    worker: Mutex<Option<RawInputWorker>>,
    debug: Arc<Mutex<RawMouseDebugPayload>>,
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
        let mut worker = self.worker.lock().map_err(|error| error.to_string())?;

        if worker.is_some() {
            return Ok(true);
        }

        self.update_debug(|debug| {
            debug.running = false;
            debug.status = "starting".to_string();
            debug.message = "Starting Windows Raw Input mouse stream".to_string();
        });

        match start_raw_mouse_worker(app, Arc::clone(&self.debug)) {
            Ok(next_worker) => {
                *worker = Some(next_worker);
                self.update_debug(|debug| {
                    debug.running = true;
                });
                Ok(true)
            }
            Err(error) => {
                *worker = None;
                self.update_debug(|debug| {
                    debug.running = false;
                    debug.status = "error".to_string();
                    debug.message = error.clone();
                });
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

        self.update_debug(|debug| {
            debug.running = false;
            debug.status = "stopped".to_string();
            debug.message = "Raw input is stopped".to_string();
            debug.poll_count = 0;
            debug.empty_poll_count = 0;
        });

        stopped
    }

    pub fn debug(&self) -> RawMouseDebugPayload {
        self.debug
            .lock()
            .map(|debug| debug.clone())
            .unwrap_or_default()
    }

    fn update_debug(&self, update: impl FnOnce(&mut RawMouseDebugPayload)) {
        if let Ok(mut debug) = self.debug.lock() {
            update(&mut debug);
        }
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
pub fn get_raw_mouse_debug(state: tauri::State<'_, RawInputState>) -> RawMouseDebugPayload {
    state.debug()
}

#[cfg(target_os = "windows")]
fn start_raw_mouse_worker(
    app: AppHandle,
    debug: Arc<Mutex<RawMouseDebugPayload>>,
) -> Result<RawInputWorker, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);
    let (init_tx, init_rx) = mpsc::channel();

    std::thread::Builder::new()
        .name("motion-anchor-raw-input".to_string())
        .spawn(move || run_windows_raw_mouse_stream(app, thread_stop, init_tx, debug))
        .map_err(|error| error.to_string())?;

    init_rx
        .recv()
        .map_err(|_| "Raw input worker stopped before initialization".to_string())??;

    Ok(RawInputWorker { stop })
}

#[cfg(not(target_os = "windows"))]
fn start_raw_mouse_worker(
    app: AppHandle,
    debug: Arc<Mutex<RawMouseDebugPayload>>,
) -> Result<RawInputWorker, String> {
    if let Ok(mut debug) = debug.lock() {
        debug.running = false;
        debug.status = "unsupported".to_string();
        debug.message = "multiinput raw mouse prototype is Windows-only".to_string();
    }

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
fn run_windows_raw_mouse_stream(
    app: AppHandle,
    stop: Arc<AtomicBool>,
    init_tx: mpsc::Sender<Result<(), String>>,
    debug: Arc<Mutex<RawMouseDebugPayload>>,
) {
    use multiinput::{DeviceType, RawEvent, RawInputManager};
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    let mut manager = match RawInputManager::new() {
        Ok(manager) => manager,
        Err(error) => {
            let message = error.to_string();
            if let Ok(mut debug) = debug.lock() {
                debug.running = false;
                debug.status = "error".to_string();
                debug.message = message.clone();
            }
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
    if let Ok(mut debug) = debug.lock() {
        debug.running = true;
        debug.status = "listening".to_string();
        debug.message = "Windows Raw Input mouse stream started".to_string();
        debug.mouse_count = device_stats.number_of_mice;
        debug.keyboard_count = device_stats.number_of_keyboards;
        debug.joystick_count = device_stats.number_of_joysticks;
        debug.poll_count = 0;
        debug.empty_poll_count = 0;
        debug.event_count = 0;
        debug.last_event_at_ms = None;
        debug.last_dx = 0;
        debug.last_dy = 0;
        debug.last_speed = 0.0;
        debug.last_acceleration = 0.0;
    }
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

    let mut last_sample = Instant::now();
    let mut last_speed = 0.0;

    while !stop.load(Ordering::Relaxed) {
        if let Ok(mut debug) = debug.lock() {
            debug.poll_count = debug.poll_count.saturating_add(1);
        }

        match manager.get_event() {
            Some(RawEvent::MouseMoveEvent(device_id, dx, dy)) => {
                let now = Instant::now();
                let dt = now.duration_since(last_sample).as_secs_f64().max(0.000_001);
                last_sample = now;

                let distance = ((dx * dx + dy * dy) as f64).sqrt();
                let speed = distance / dt;
                let acceleration = (speed - last_speed) / dt;
                last_speed = speed;

                let timestamp_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_millis())
                    .unwrap_or_default();

                if let Ok(mut debug) = debug.lock() {
                    debug.event_count = debug.event_count.saturating_add(1);
                    debug.last_event_at_ms = Some(timestamp_ms);
                    debug.last_dx = dx;
                    debug.last_dy = dy;
                    debug.last_speed = speed;
                    debug.last_acceleration = acceleration;
                }

                let _ = app.emit_to(
                    "main",
                    RAW_MOUSE_EVENT,
                    RawMousePayload {
                        device_id,
                        dx,
                        dy,
                        dt_ms: dt * 1000.0,
                        speed,
                        acceleration,
                        timestamp_ms,
                    },
                );
            }
            Some(_) => {}
            None => {
                if let Ok(mut debug) = debug.lock() {
                    debug.empty_poll_count = debug.empty_poll_count.saturating_add(1);
                }
                std::thread::sleep(Duration::from_millis(1));
            }
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

    if let Ok(mut debug) = debug.lock() {
        debug.running = false;
        debug.status = "stopped".to_string();
        debug.message = "Windows Raw Input mouse stream stopped".to_string();
    }
}
