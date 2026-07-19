use std::{
    collections::{HashMap, HashSet},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    time::Duration,
};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use super::profile::{sanitize_profile, InputProfile, Stick, Vector2InputSource};
use crate::settings_store;

const INPUT_VECTOR2_EVENT: &str = "input-vector2";
const INPUT_STATUS_EVENT: &str = "input-status";
pub const INPUT_PROFILE_CHANGED_EVENT: &str = "input-profile-changed";
const INPUT_TICK_HZ: u64 = 120;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputVector2Payload {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputStatusPayload {
    pub status: &'static str,
    pub message: String,
}

pub struct InputState {
    worker: Mutex<Option<InputWorker>>,
    profile: Arc<Mutex<InputProfile>>,
    profile_initialized: AtomicBool,
}

impl Default for InputState {
    fn default() -> Self {
        Self {
            worker: Mutex::new(None),
            profile: Arc::new(Mutex::new(InputProfile::default())),
            profile_initialized: AtomicBool::new(false),
        }
    }
}

struct InputWorker {
    stop: Arc<AtomicBool>,
}

impl Drop for InputWorker {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
    }
}

impl InputState {
    pub fn is_enabled(&self) -> bool {
        self.worker
            .lock()
            .map(|worker| worker.is_some())
            .unwrap_or(false)
    }

    pub fn start(&self, app: AppHandle) -> Result<bool, String> {
        self.ensure_profile(&app)?;

        let mut worker = self.worker.lock().map_err(|error| error.to_string())?;

        if worker.is_some() {
            return Ok(true);
        }

        match start_input_worker(app, Arc::clone(&self.profile)) {
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
        self.worker
            .lock()
            .map(|mut worker| worker.take().is_some())
            .unwrap_or(false)
    }

    pub fn profile(&self, app: &AppHandle) -> Result<InputProfile, String> {
        self.ensure_profile(app)?;
        self.profile
            .lock()
            .map(|profile| profile.clone())
            .map_err(|error| error.to_string())
    }

    pub fn set_profile(
        &self,
        app: &AppHandle,
        profile: InputProfile,
    ) -> Result<InputProfile, String> {
        let profile = sanitize_profile(profile);
        settings_store::set(app, settings_store::INPUT_PROFILE_KEY, &profile)?;
        self.apply_profile(profile.clone())?;
        app.emit(INPUT_PROFILE_CHANGED_EVENT, profile.clone())
            .map_err(|error| error.to_string())?;
        Ok(profile)
    }

    fn ensure_profile(&self, app: &AppHandle) -> Result<(), String> {
        if self.profile_initialized.load(Ordering::Relaxed) {
            return Ok(());
        }

        let profile = settings_store::get(app, settings_store::INPUT_PROFILE_KEY)?
            .map(sanitize_profile)
            .unwrap_or_default();

        self.apply_profile(profile)
    }

    fn apply_profile(&self, profile: InputProfile) -> Result<(), String> {
        let mut current = self.profile.lock().map_err(|error| error.to_string())?;
        *current = profile;
        self.profile_initialized.store(true, Ordering::Relaxed);
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn start_input_worker(
    app: AppHandle,
    profile: Arc<Mutex<InputProfile>>,
) -> Result<InputWorker, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);
    let (init_tx, init_rx) = mpsc::channel();

    std::thread::Builder::new()
        .name("motion-anchor-input".to_string())
        .spawn(move || run_windows_input_stream(app, profile, thread_stop, init_tx))
        .map_err(|error| error.to_string())?;

    init_rx
        .recv()
        .map_err(|_| "Input worker stopped before initialization".to_string())??;

    Ok(InputWorker { stop })
}

#[cfg(not(target_os = "windows"))]
fn start_input_worker(
    app: AppHandle,
    _profile: Arc<Mutex<InputProfile>>,
) -> Result<InputWorker, String> {
    emit_input_status(
        &app,
        "unsupported",
        "Input runtime is Windows-only".to_string(),
    );

    Err("Raw input is Windows-only".to_string())
}

fn emit_input_status(app: &AppHandle, status: &'static str, message: String) {
    let _ = app.emit(INPUT_STATUS_EVENT, InputStatusPayload { status, message });
}

fn apply_axis_options(x: f64, y: f64, scale: f64, invert_x: bool, invert_y: bool) -> (f64, f64) {
    (
        if invert_x { -x } else { x } * scale,
        if invert_y { -y } else { y } * scale,
    )
}

fn apply_deadzone(x: f64, y: f64, deadzone: f64) -> (f64, f64) {
    let magnitude = x.hypot(y);

    if magnitude <= deadzone {
        return (0.0, 0.0);
    }

    let normalized = ((magnitude - deadzone) / (1.0 - deadzone)).clamp(0.0, 1.0);
    let scale = normalized / magnitude;
    (x * scale, y * scale)
}

#[cfg(target_os = "windows")]
#[derive(Default)]
struct InputAccumulator {
    mouse_dx: f64,
    mouse_dy: f64,
    pressed_keys: HashSet<multiinput::KeyId>,
    xinput_sticks: HashMap<usize, GamepadAxes>,
    rawinput_sticks: HashMap<usize, GamepadAxes>,
    active_ids: HashSet<String>,
}

#[cfg(target_os = "windows")]
#[derive(Clone, Copy, Default)]
struct GamepadAxes {
    left_x: f64,
    left_y: f64,
    right_x: f64,
    right_y: f64,
}

#[cfg(target_os = "windows")]
impl InputAccumulator {
    fn take_mouse(&mut self) -> (f64, f64) {
        let dx = self.mouse_dx;
        let dy = self.mouse_dy;
        self.mouse_dx = 0.0;
        self.mouse_dy = 0.0;
        (dx, dy)
    }

    fn keyboard_wasd(&self) -> (f64, f64) {
        use multiinput::KeyId;

        let x = f64::from(self.pressed_keys.contains(&KeyId::D) as u8)
            - f64::from(self.pressed_keys.contains(&KeyId::A) as u8);
        let y = f64::from(self.pressed_keys.contains(&KeyId::S) as u8)
            - f64::from(self.pressed_keys.contains(&KeyId::W) as u8);
        let magnitude = x.hypot(y);

        if magnitude > 1.0 {
            (x / magnitude, y / magnitude)
        } else {
            (x, y)
        }
    }

    fn stick(&self, device_id: Option<usize>, stick: Stick) -> (f64, f64) {
        if let Some(device_id) = device_id {
            return self
                .xinput_sticks
                .get(&device_id)
                .or_else(|| self.rawinput_sticks.get(&device_id))
                .map(|axes| axes.stick(stick))
                .unwrap_or_default();
        }

        first_active_stick(&self.xinput_sticks, stick)
            .or_else(|| first_active_stick(&self.rawinput_sticks, stick))
            .unwrap_or_default()
    }

    fn clear_xinput_stick(&mut self, device_id: usize) {
        self.xinput_sticks.remove(&device_id);
    }

    fn ensure_xinput_stick(&mut self, device_id: usize) {
        self.xinput_sticks.entry(device_id).or_default();
    }

    fn update_xinput_axis(&mut self, device_id: usize, axis: gilrs::Axis, value: f64) {
        let axes = self.xinput_sticks.entry(device_id).or_default();
        axes.update_gilrs_axis(axis, value);
    }

    fn update_rawinput_axis(&mut self, device_id: usize, axis: multiinput::Axis, value: f64) {
        let axes = self.rawinput_sticks.entry(device_id).or_default();
        axes.update_multiinput_axis(axis, value);
    }
}

#[cfg(target_os = "windows")]
impl GamepadAxes {
    fn stick(self, stick: Stick) -> (f64, f64) {
        match stick {
            Stick::Left => (self.left_x, self.left_y),
            Stick::Right => (self.right_x, self.right_y),
        }
    }

    fn update_gilrs_axis(&mut self, axis: gilrs::Axis, value: f64) {
        match axis {
            gilrs::Axis::LeftStickX => self.left_x = value,
            gilrs::Axis::LeftStickY => self.left_y = -value,
            gilrs::Axis::RightStickX => self.right_x = value,
            gilrs::Axis::RightStickY => self.right_y = -value,
            _ => {}
        }
    }

    fn update_multiinput_axis(&mut self, axis: multiinput::Axis, value: f64) {
        match axis {
            multiinput::Axis::X => self.left_x = value,
            multiinput::Axis::Y => self.left_y = value,
            multiinput::Axis::RX => self.right_x = value,
            multiinput::Axis::RY => self.right_y = value,
            _ => {}
        }
    }
}

#[cfg(target_os = "windows")]
fn first_active_stick(sticks: &HashMap<usize, GamepadAxes>, stick: Stick) -> Option<(f64, f64)> {
    sticks
        .values()
        .map(|axes| axes.stick(stick))
        .find(|(x, y)| *x != 0.0 || *y != 0.0)
}

#[cfg(target_os = "windows")]
fn run_windows_input_stream(
    app: AppHandle,
    profile: Arc<Mutex<InputProfile>>,
    stop: Arc<AtomicBool>,
    init_tx: mpsc::Sender<Result<(), String>>,
) {
    use gilrs::{EventType as GamepadEventType, Gilrs};
    use multiinput::{DeviceType, KeyId, RawEvent, RawInputManager, State, XInputInclude};

    let mut manager = match RawInputManager::new() {
        Ok(manager) => manager,
        Err(error) => {
            let message = error.to_string();
            let _ = init_tx.send(Err(message.clone()));
            emit_input_status(&app, "error", message);
            return;
        }
    };

    manager.register_devices(DeviceType::Mice);
    manager.register_devices(DeviceType::Keyboards);
    manager.register_devices(DeviceType::Joysticks(XInputInclude::False));

    let device_stats = manager.get_device_stats();
    let mut gamepads = match Gilrs::new() {
        Ok(gamepads) => Some(gamepads),
        Err(error) => {
            emit_input_status(
                &app,
                "warning",
                format!("Gamepad input unavailable: {error}"),
            );
            None
        }
    };
    let gamepad_count = gamepads
        .as_ref()
        .map(|gamepads| gamepads.gamepads().count())
        .unwrap_or_default();
    let _ = init_tx.send(Ok(()));

    emit_input_status(
        &app,
        "listening",
        format!(
            "Input stream started. Mice: {}, keyboards: {}, XInput gamepads: {}, Raw Input fallback gamepads: {}",
            device_stats.number_of_mice,
            device_stats.number_of_keyboards,
            gamepad_count,
            device_stats.number_of_joysticks
        ),
    );

    let mut accumulator = InputAccumulator::default();
    let mut last_tick = std::time::Instant::now();
    let tick_interval = Duration::from_secs_f64(1.0 / INPUT_TICK_HZ as f64);

    while !stop.load(Ordering::Relaxed) {
        while let Some(event) = manager.get_event() {
            match event {
                RawEvent::MouseMoveEvent(_, dx, dy) => {
                    accumulator.mouse_dx += f64::from(dx);
                    accumulator.mouse_dy += f64::from(dy);
                }
                RawEvent::KeyboardEvent(
                    _,
                    key @ (KeyId::W | KeyId::A | KeyId::S | KeyId::D),
                    state,
                ) => match state {
                    State::Pressed => {
                        accumulator.pressed_keys.insert(key);
                    }
                    State::Released => {
                        accumulator.pressed_keys.remove(&key);
                    }
                },
                RawEvent::JoystickAxisEvent(device_id, axis, value) => {
                    accumulator.update_rawinput_axis(device_id, axis, value);
                }
                _ => {}
            }
        }

        if let Some(gamepads) = &mut gamepads {
            while let Some(event) = gamepads.next_event() {
                let device_id = usize::from(event.id);

                match event.event {
                    GamepadEventType::AxisChanged(axis, value, _) => {
                        accumulator.update_xinput_axis(device_id, axis, f64::from(value));
                    }
                    GamepadEventType::Connected => {
                        accumulator.ensure_xinput_stick(device_id);
                    }
                    GamepadEventType::Disconnected => {
                        accumulator.clear_xinput_stick(device_id);
                    }
                    _ => {}
                }
            }
        }

        if last_tick.elapsed() >= tick_interval {
            emit_profile_vectors(&app, &profile, &mut accumulator);
            last_tick = std::time::Instant::now();
        } else {
            std::thread::sleep(Duration::from_millis(1));
        }
    }

    emit_input_status(&app, "stopped", "Input stream stopped".to_string());
}

#[cfg(target_os = "windows")]
fn emit_profile_vectors(
    app: &AppHandle,
    profile: &Arc<Mutex<InputProfile>>,
    accumulator: &mut InputAccumulator,
) {
    let profile = match profile.lock() {
        Ok(profile) => profile.clone(),
        Err(_) => return,
    };
    let (mouse_dx, mouse_dy) = accumulator.take_mouse();
    let mut next_active_ids = HashSet::new();

    for binding in &profile.vector2 {
        let mut x = 0.0;
        let mut y = 0.0;

        for source in &binding.sources {
            match source {
                Vector2InputSource::MouseMotion {
                    scale,
                    invert_x,
                    invert_y,
                } => {
                    let (sx, sy) =
                        apply_axis_options(mouse_dx, mouse_dy, *scale, *invert_x, *invert_y);
                    x += sx;
                    y += sy;
                }
                Vector2InputSource::KeyboardWasd {
                    scale,
                    invert_x,
                    invert_y,
                } => {
                    let (kx, ky) = accumulator.keyboard_wasd();
                    let (sx, sy) = apply_axis_options(kx, ky, *scale, *invert_x, *invert_y);
                    x += sx;
                    y += sy;
                }
                Vector2InputSource::GamepadStick {
                    device_id,
                    stick,
                    deadzone,
                    scale,
                    invert_x,
                    invert_y,
                } => {
                    let (gx, gy) = accumulator.stick(*device_id, *stick);
                    let (gx, gy) = apply_deadzone(gx, gy, *deadzone);
                    let (sx, sy) = apply_axis_options(gx, gy, *scale, *invert_x, *invert_y);
                    x += sx;
                    y += sy;
                }
            }
        }

        let active = x != 0.0 || y != 0.0;

        if active {
            next_active_ids.insert(binding.id.clone());
        }

        if active || accumulator.active_ids.contains(&binding.id) {
            let _ = app.emit_to(
                "main",
                INPUT_VECTOR2_EVENT,
                InputVector2Payload {
                    id: binding.id.clone(),
                    x,
                    y,
                },
            );
        }
    }

    accumulator.active_ids = next_active_ids;
}
