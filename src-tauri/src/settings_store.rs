use std::time::Duration;

use serde::{de::DeserializeOwned, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::{resolve_store_path, StoreExt};

const SETTINGS_STORE_FILE: &str = "settings.json";
const SETTINGS_STORE_AUTO_SAVE_MS: u64 = 300;

pub const PLUGIN_OVERRIDES_KEY: &str = "pluginOverrides";
pub const INPUT_PROFILE_KEY: &str = "inputProfile";
pub const SHORTCUTS_KEY: &str = "shortcuts";

pub fn get<T>(app: &AppHandle, key: &str) -> Result<Option<T>, String>
where
    T: DeserializeOwned,
{
    settings_store(app)?
        .get(key)
        .map(serde_json::from_value)
        .transpose()
        .map_err(|error| error.to_string())
}

pub fn set<T>(app: &AppHandle, key: &str, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let value = serde_json::to_value(value).map_err(|error| error.to_string())?;

    settings_store(app)?.set(key, value);
    Ok(())
}

pub fn path_label(app: &AppHandle) -> Result<String, String> {
    resolve_store_path(app, SETTINGS_STORE_FILE)
        .map(|path| path.display().to_string())
        .map_err(|error| error.to_string())
}

fn settings_store(
    app: &AppHandle,
) -> Result<std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>, String> {
    app.store_builder(SETTINGS_STORE_FILE)
        .auto_save(Duration::from_millis(SETTINGS_STORE_AUTO_SAVE_MS))
        .build()
        .map_err(|error| error.to_string())
}
