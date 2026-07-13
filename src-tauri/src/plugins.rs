use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::{AppHandle, Emitter};

use crate::settings_store;

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
    if let Some(mut payload) =
        settings_store::get::<PluginOverridesPayload>(app, settings_store::PLUGIN_OVERRIDES_KEY)?
    {
        payload.root = root_label(app)?;
        return Ok(payload);
    }

    Ok(PluginOverridesPayload {
        root: root_label(app)?,
        plugins: HashMap::new(),
    })
}

fn write_store(app: &AppHandle, store: &PluginOverridesPayload) -> Result<(), String> {
    settings_store::set(app, settings_store::PLUGIN_OVERRIDES_KEY, store)
}

fn root_label(app: &AppHandle) -> Result<String, String> {
    settings_store::path_label(app)
}
