use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
    str::FromStr,
    sync::Mutex,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{
    GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState as KeyState,
};

use crate::{plugins, set_overlay_visibility_inner, AppState};

const SHORTCUTS_CHANGED_EVENT: &str = "shortcuts-changed";

#[derive(Default)]
pub struct ShortcutState {
    bindings: Mutex<HashMap<String, Vec<String>>>,
    actions_by_shortcut: Mutex<HashMap<u32, String>>,
    update_lock: Mutex<()>,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ShortcutConfig {
    bindings: HashMap<String, Vec<String>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutAction {
    id: String,
    scope: String,
    operation: String,
    plugin_id: Option<String>,
    shortcuts: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutSettings {
    actions: Vec<ShortcutAction>,
}

pub fn handle_shortcut(app: &AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state != KeyState::Pressed {
        return;
    }

    let state = app.state::<ShortcutState>();
    let action_id = state
        .actions_by_shortcut
        .lock()
        .ok()
        .and_then(|actions| actions.get(&shortcut.id()).cloned());

    if let Some(action_id) = action_id {
        if let Err(error) = dispatch_action(app, &action_id) {
            eprintln!("shortcut action failed: {error}");
        }
    }
}

pub fn initialize(app: &AppHandle) -> Result<(), String> {
    let valid_actions = action_ids()?;
    let mut bindings = read_config(app)?.bindings;
    bindings.retain(|action_id, _| valid_actions.contains(action_id));
    if let Err(error) = register_bindings(app, &bindings) {
        let _ = app.global_shortcut().unregister_all();
        return Err(error);
    }
    app.state::<ShortcutState>()
        .bindings
        .lock()
        .map_err(|_| "shortcut state is unavailable".to_string())?
        .clone_from(&bindings);
    Ok(())
}

#[tauri::command]
pub fn get_shortcut_settings(state: State<'_, ShortcutState>) -> Result<ShortcutSettings, String> {
    let bindings = state
        .bindings
        .lock()
        .map_err(|_| "shortcut state is unavailable".to_string())?;
    build_settings(&bindings)
}

#[tauri::command]
pub fn set_action_shortcuts(
    app: AppHandle,
    state: State<'_, ShortcutState>,
    action_id: String,
    shortcuts: Vec<String>,
) -> Result<ShortcutSettings, String> {
    let _update_guard = state
        .update_lock
        .lock()
        .map_err(|_| "shortcut update is unavailable".to_string())?;
    let valid_actions = action_ids()?;
    if !valid_actions.contains(&action_id) {
        return Err(format!("unknown shortcut action: {action_id}"));
    }

    let old_bindings = state
        .bindings
        .lock()
        .map_err(|_| "shortcut state is unavailable".to_string())?
        .clone();
    let mut next_bindings = old_bindings.clone();
    let normalized = normalize_shortcuts(shortcuts)?;

    if normalized.is_empty() {
        next_bindings.remove(&action_id);
    } else {
        next_bindings.insert(action_id, normalized);
    }

    validate_unique(&next_bindings)?;
    replace_registered_bindings(&app, &old_bindings, &next_bindings)?;
    if let Err(error) = write_config(
        &app,
        &ShortcutConfig {
            bindings: next_bindings.clone(),
        },
    ) {
        let _ = replace_registered_bindings(&app, &next_bindings, &old_bindings);
        return Err(error);
    }

    *state
        .bindings
        .lock()
        .map_err(|_| "shortcut state is unavailable".to_string())? = next_bindings.clone();

    let settings = build_settings(&next_bindings)?;
    let _ = app.emit(SHORTCUTS_CHANGED_EVENT, settings.clone());
    Ok(settings)
}

fn build_settings(bindings: &HashMap<String, Vec<String>>) -> Result<ShortcutSettings, String> {
    let mut actions = vec![
        action("overlay.show", "app", "show", None, bindings),
        action("overlay.hide", "app", "hide", None, bindings),
        action("overlay.toggle", "app", "toggle", None, bindings),
    ];

    for plugin in plugins::read_plugin_directory()?.plugins {
        for operation in ["enable", "disable", "toggle"] {
            let id = format!("plugin:{}:{operation}", plugin.id);
            actions.push(action(
                &id,
                "plugin",
                operation,
                Some(plugin.id.clone()),
                bindings,
            ));
        }
    }

    Ok(ShortcutSettings { actions })
}

fn action(
    id: &str,
    scope: &str,
    operation: &str,
    plugin_id: Option<String>,
    bindings: &HashMap<String, Vec<String>>,
) -> ShortcutAction {
    ShortcutAction {
        id: id.to_string(),
        scope: scope.to_string(),
        operation: operation.to_string(),
        plugin_id,
        shortcuts: bindings.get(id).cloned().unwrap_or_default(),
    }
}

fn action_ids() -> Result<HashSet<String>, String> {
    Ok(build_settings(&HashMap::new())?
        .actions
        .into_iter()
        .map(|action| action.id)
        .collect())
}

fn dispatch_action(app: &AppHandle, action_id: &str) -> Result<(), String> {
    match action_id {
        "overlay.show" => set_overlay_visibility(app, true),
        "overlay.hide" => set_overlay_visibility(app, false),
        "overlay.toggle" => {
            let state = app.state::<AppState>();
            let visible = state
                .overlay_visible
                .lock()
                .map(|visible| *visible)
                .unwrap_or(true);
            set_overlay_visibility_inner(app, &state, !visible).map(|_| ())
        }
        _ => {
            let value = action_id
                .strip_prefix("plugin:")
                .and_then(|value| value.rsplit_once(':'))
                .ok_or_else(|| format!("unknown shortcut action: {action_id}"))?;

            match value.1 {
                "enable" => plugins::set_plugin_enabled_inner(app, value.0, true).map(|_| ()),
                "disable" => plugins::set_plugin_enabled_inner(app, value.0, false).map(|_| ()),
                "toggle" => plugins::toggle_plugin_enabled_inner(app, value.0).map(|_| ()),
                _ => Err(format!("unknown shortcut action: {action_id}")),
            }
        }
    }
}

fn set_overlay_visibility(app: &AppHandle, visible: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    set_overlay_visibility_inner(app, &state, visible).map(|_| ())
}

fn normalize_shortcuts(shortcuts: Vec<String>) -> Result<Vec<String>, String> {
    let mut normalized = Vec::new();

    for value in shortcuts {
        let shortcut = Shortcut::from_str(&value).map_err(|error| error.to_string())?;
        let value = shortcut.into_string();
        if !normalized.contains(&value) {
            normalized.push(value);
        }
    }

    Ok(normalized)
}

fn validate_unique(bindings: &HashMap<String, Vec<String>>) -> Result<(), String> {
    let mut owners = HashMap::new();

    for (action_id, shortcuts) in bindings {
        for shortcut in shortcuts {
            if let Some(owner) = owners.insert(shortcut, action_id) {
                return Err(format!(
                    "shortcut {shortcut} is already assigned to {owner}"
                ));
            }
        }
    }

    Ok(())
}

fn replace_registered_bindings(
    app: &AppHandle,
    old_bindings: &HashMap<String, Vec<String>>,
    next_bindings: &HashMap<String, Vec<String>>,
) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| error.to_string())?;

    if let Err(error) = register_bindings(app, next_bindings) {
        let _ = app.global_shortcut().unregister_all();
        let _ = register_bindings(app, old_bindings);
        return Err(error);
    }

    Ok(())
}

fn register_bindings(
    app: &AppHandle,
    bindings: &HashMap<String, Vec<String>>,
) -> Result<(), String> {
    validate_unique(bindings)?;
    let mut actions_by_shortcut = HashMap::new();
    let mut shortcuts = Vec::new();

    for (action_id, values) in bindings {
        for value in values {
            let shortcut = Shortcut::from_str(value).map_err(|error| error.to_string())?;
            actions_by_shortcut.insert(shortcut.id(), action_id.clone());
            shortcuts.push(shortcut);
        }
    }

    if !shortcuts.is_empty() {
        app.global_shortcut()
            .register_multiple(shortcuts)
            .map_err(|error| error.to_string())?;
    }

    *app.state::<ShortcutState>()
        .actions_by_shortcut
        .lock()
        .map_err(|_| "shortcut state is unavailable".to_string())? = actions_by_shortcut;
    Ok(())
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|path| path.join("shortcuts.json"))
        .map_err(|error| error.to_string())
}

fn read_config(app: &AppHandle) -> Result<ShortcutConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(ShortcutConfig::default());
    }

    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&text).map_err(|error| error.to_string())
}

fn write_config(app: &AppHandle, config: &ShortcutConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let text = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;
    fs::write(path, text).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_and_deduplicates_shortcuts() {
        let shortcuts = normalize_shortcuts(vec![
            "Ctrl+Shift+K".to_string(),
            "control+shift+KeyK".to_string(),
        ])
        .unwrap();

        assert_eq!(shortcuts, vec!["shift+control+KeyK"]);
    }

    #[test]
    fn rejects_shortcuts_shared_by_multiple_actions() {
        let bindings = HashMap::from([
            ("overlay.show".to_string(), vec!["control+KeyK".to_string()]),
            ("overlay.hide".to_string(), vec!["control+KeyK".to_string()]),
        ]);

        assert!(validate_unique(&bindings).is_err());
    }
}
