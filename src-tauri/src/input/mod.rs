mod profile;
mod runtime;

pub use profile::InputProfile;
pub use runtime::InputState;

use tauri::AppHandle;

#[tauri::command]
pub fn get_input_enabled(state: tauri::State<'_, InputState>) -> bool {
    state.is_enabled()
}

#[tauri::command]
pub fn set_input_enabled(
    app: AppHandle,
    state: tauri::State<'_, InputState>,
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
pub fn get_input_profile(
    app: AppHandle,
    state: tauri::State<'_, InputState>,
) -> Result<InputProfile, String> {
    state.profile(&app)
}

#[tauri::command]
pub fn set_input_profile(
    app: AppHandle,
    state: tauri::State<'_, InputState>,
    profile: InputProfile,
) -> Result<InputProfile, String> {
    state.set_profile(&app, profile)
}
