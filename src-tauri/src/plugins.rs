use std::{collections::HashMap, fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::{AppHandle, Emitter, Manager};

const PLUGINS_CHANGED_EVENT: &str = "plugins-changed";

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginOverridesPayload {
    pub root: String,
    pub plugins: HashMap<String, PluginOverride>,
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginOverride {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(default, skip_serializing_if = "Map::is_empty")]
    pub settings: Map<String, Value>,
}

#[tauri::command]
pub fn load_plugin_overrides(app: AppHandle) -> Result<PluginOverridesPayload, String> {
    read_store(&app)
}

#[tauri::command]
pub fn set_plugin_enabled(
    app: AppHandle,
    id: String,
    enabled: bool,
) -> Result<PluginOverridesPayload, String> {
    update_plugin(&app, &id, |plugin| {
        plugin.enabled = Some(enabled);
    })
}

#[tauri::command]
pub fn update_plugin_setting(
    app: AppHandle,
    id: String,
    key: String,
    value: Value,
) -> Result<PluginOverridesPayload, String> {
    update_plugin(&app, &id, |plugin| {
        plugin.settings.insert(key, value);
    })
}

fn update_plugin<F>(app: &AppHandle, id: &str, update: F) -> Result<PluginOverridesPayload, String>
where
    F: FnOnce(&mut PluginOverride),
{
    let mut store = read_store(app)?;
    update(store.plugins.entry(id.to_string()).or_default());
    write_store(app, &store)?;
    app.emit(PLUGINS_CHANGED_EVENT, store.clone())
        .map_err(|error| error.to_string())?;
    Ok(store)
}

fn read_store(app: &AppHandle) -> Result<PluginOverridesPayload, String> {
    let path = store_path(app)?;
    if !path.exists() {
        return Ok(PluginOverridesPayload {
            root: root_label(app)?,
            plugins: HashMap::new(),
        });
    }

    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let mut store: PluginOverridesPayload =
        serde_json::from_str(&text).map_err(|error| error.to_string())?;
    store.root = root_label(app)?;
    Ok(store)
}

fn write_store(app: &AppHandle, store: &PluginOverridesPayload) -> Result<(), String> {
    let path = store_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let text = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
    fs::write(path, text).map_err(|error| error.to_string())
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|path| path.join("plugin-overrides.json"))
        .map_err(|error| error.to_string())
}

fn root_label(app: &AppHandle) -> Result<String, String> {
    store_path(app).map(|path| path.display().to_string())
}
