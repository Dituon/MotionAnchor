use std::{
    fs, io,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::{AppHandle, Emitter};

const PLUGINS_DIR_NAME: &str = "plugins";
const PLUGIN_FILE_NAME: &str = "plugin.json";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginDirectoryPayload {
    pub root: String,
    pub plugins: Vec<PluginManifest>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub renderer: String,
    pub enabled: bool,
    pub order: i32,
    pub description: String,
    pub settings: Map<String, Value>,
    pub schema: Vec<PluginSettingSchema>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginSettingSchema {
    pub key: String,
    pub label: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub length: Option<PluginLengthSettingSchema>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginLengthSettingSchema {
    pub px: PluginLengthUnitSchema,
    pub percent: PluginLengthUnitSchema,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginLengthUnitSchema {
    pub default_value: f64,
    pub min: f64,
    pub max: f64,
    pub step: f64,
}

pub fn app_root() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")));

        if workspace_root.exists() {
            workspace_root
        } else {
            std::env::current_exe()
                .ok()
                .and_then(|path| path.parent().map(PathBuf::from))
                .or_else(|| std::env::current_dir().ok())
                .unwrap_or_else(|| PathBuf::from("."))
        }
    }

    #[cfg(not(debug_assertions))]
    {
        std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(PathBuf::from))
            .or_else(|| std::env::current_dir().ok())
            .unwrap_or_else(|| PathBuf::from("."))
    }
}

fn plugins_root() -> PathBuf {
    app_root().join(PLUGINS_DIR_NAME)
}

pub fn ensure_plugin_directory() -> io::Result<PathBuf> {
    let root = plugins_root();
    fs::create_dir_all(&root)?;

    let builtins = builtin_plugins();
    let builtin_ids = builtins
        .iter()
        .map(|manifest| manifest.id.clone())
        .collect::<Vec<_>>();

    for entry in fs::read_dir(&root)? {
        let entry = entry?;
        if !entry.path().is_dir() {
            continue;
        }

        let file_name = entry.file_name();
        let directory_name = file_name.to_string_lossy();
        if directory_name.starts_with("builtin.")
            && !builtin_ids.iter().any(|id| id == directory_name.as_ref())
        {
            fs::remove_dir_all(entry.path())?;
        }
    }

    for manifest in builtins {
        let plugin_dir = root.join(&manifest.id);
        let plugin_file = plugin_dir.join(PLUGIN_FILE_NAME);
        fs::create_dir_all(&plugin_dir)?;

        write_manifest(
            &plugin_file,
            &merge_existing_builtin_manifest(&plugin_file, manifest)?,
        )?;
    }

    Ok(root)
}

pub fn read_plugin_directory() -> Result<PluginDirectoryPayload, String> {
    let root = ensure_plugin_directory().map_err(|error| error.to_string())?;
    let mut plugins = Vec::new();

    for entry in fs::read_dir(&root).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let plugin_file = entry.path().join(PLUGIN_FILE_NAME);

        if !plugin_file.is_file() {
            continue;
        }

        let text = fs::read_to_string(&plugin_file).map_err(|error| error.to_string())?;
        let manifest: PluginManifest = serde_json::from_str(&text)
            .map_err(|error| format!("{}: {error}", plugin_file.display()))?;
        plugins.push(manifest);
    }

    plugins.sort_by(|left, right| {
        left.order
            .cmp(&right.order)
            .then_with(|| left.name.cmp(&right.name))
    });

    Ok(PluginDirectoryPayload {
        root: root.display().to_string(),
        plugins,
    })
}

#[tauri::command]
pub fn list_plugins() -> Result<PluginDirectoryPayload, String> {
    read_plugin_directory()
}

#[tauri::command]
pub fn set_plugin_enabled(
    app: AppHandle,
    id: String,
    enabled: bool,
) -> Result<PluginDirectoryPayload, String> {
    set_plugin_enabled_inner(&app, &id, enabled)
}

pub fn set_plugin_enabled_inner(
    app: &AppHandle,
    id: &str,
    enabled: bool,
) -> Result<PluginDirectoryPayload, String> {
    update_plugin(app, id, |manifest| {
        manifest.enabled = enabled;
    })
}

pub fn toggle_plugin_enabled_inner(
    app: &AppHandle,
    id: &str,
) -> Result<PluginDirectoryPayload, String> {
    update_plugin(app, id, |manifest| {
        manifest.enabled = !manifest.enabled;
    })
}

#[tauri::command]
pub fn update_plugin_setting(
    app: AppHandle,
    id: String,
    key: String,
    value: Value,
) -> Result<PluginDirectoryPayload, String> {
    update_plugin(&app, &id, |manifest| {
        manifest.settings.insert(key, value);
    })
}

fn update_plugin<F>(app: &AppHandle, id: &str, update: F) -> Result<PluginDirectoryPayload, String>
where
    F: FnOnce(&mut PluginManifest),
{
    let root = ensure_plugin_directory().map_err(|error| error.to_string())?;
    let plugin_file =
        find_plugin_file(&root, id).ok_or_else(|| format!("plugin not found: {id}"))?;
    let text = fs::read_to_string(&plugin_file).map_err(|error| error.to_string())?;
    let mut manifest: PluginManifest =
        serde_json::from_str(&text).map_err(|error| error.to_string())?;

    update(&mut manifest);
    write_manifest(&plugin_file, &manifest).map_err(|error| error.to_string())?;

    let payload = read_plugin_directory()?;
    let _ = app.emit("plugins-changed", payload.clone());
    Ok(payload)
}

fn find_plugin_file(root: &Path, id: &str) -> Option<PathBuf> {
    let direct = root.join(id).join(PLUGIN_FILE_NAME);
    if direct.is_file() {
        return Some(direct);
    }

    for entry in fs::read_dir(root).ok()? {
        let plugin_file = entry.ok()?.path().join(PLUGIN_FILE_NAME);
        let text = fs::read_to_string(&plugin_file).ok()?;
        let manifest: PluginManifest = serde_json::from_str(&text).ok()?;
        if manifest.id == id {
            return Some(plugin_file);
        }
    }

    None
}

fn write_manifest(path: &Path, manifest: &PluginManifest) -> io::Result<()> {
    let text =
        serde_json::to_string_pretty(manifest).expect("builtin plugin manifest should serialize");
    fs::write(path, text)
}

fn merge_existing_builtin_manifest(
    path: &Path,
    mut latest: PluginManifest,
) -> io::Result<PluginManifest> {
    if !path.exists() {
        return Ok(latest);
    }

    let text = fs::read_to_string(path)?;
    let existing = match serde_json::from_str::<PluginManifest>(&text) {
        Ok(existing) => existing,
        Err(_) => return Ok(latest),
    };

    latest.enabled = existing.enabled;

    for (key, value) in existing.settings {
        if latest.settings.contains_key(&key) {
            latest.settings.insert(key, value);
        }
    }

    Ok(latest)
}

fn number_setting(key: &str, label: &str, min: f64, max: f64, step: f64) -> PluginSettingSchema {
    PluginSettingSchema {
        key: key.to_string(),
        label: label.to_string(),
        kind: "number".to_string(),
        min: Some(min),
        max: Some(max),
        step: Some(step),
        length: None,
    }
}

fn px_setting(key: &str, label: &str, min: f64, max: f64, step: f64) -> PluginSettingSchema {
    PluginSettingSchema {
        key: key.to_string(),
        label: label.to_string(),
        kind: "px".to_string(),
        min: Some(min),
        max: Some(max),
        step: Some(step),
        length: None,
    }
}

fn length_setting(
    key: &str,
    label: &str,
    px: PluginLengthUnitSchema,
    percent: PluginLengthUnitSchema,
) -> PluginSettingSchema {
    PluginSettingSchema {
        key: key.to_string(),
        label: label.to_string(),
        kind: "length".to_string(),
        min: None,
        max: None,
        step: None,
        length: Some(PluginLengthSettingSchema { px, percent }),
    }
}

fn color_setting(key: &str, label: &str) -> PluginSettingSchema {
    PluginSettingSchema {
        key: key.to_string(),
        label: label.to_string(),
        kind: "color".to_string(),
        min: None,
        max: None,
        step: None,
        length: None,
    }
}

fn length_unit(default_value: f64, min: f64, max: f64, step: f64) -> PluginLengthUnitSchema {
    PluginLengthUnitSchema {
        default_value,
        min,
        max,
        step,
    }
}

fn builtin_plugins() -> Vec<PluginManifest> {
    vec![
        directional_pull_ring(),
        static_ring(),
        fullscreen_reference_lines(),
        fullscreen_grid(),
        fullscreen_border(),
    ]
}

fn directional_pull_ring() -> PluginManifest {
    PluginManifest {
        id: "builtin.directional-pull-ring".to_string(),
        name: "Directional Pull Ring".to_string(),
        kind: "overlay".to_string(),
        renderer: "builtin.directionalPullRing".to_string(),
        enabled: true,
        order: 10,
        description: "Canvas ring that stretches in the raw mouse direction.".to_string(),
        settings: Map::from_iter([
            ("color".to_string(), json!("")),
            ("radius".to_string(), json!(36)),
            ("stroke".to_string(), json!(8)),
            ("opacity".to_string(), json!(0.8)),
            ("sensitivity".to_string(), json!(1.0)),
            ("deformation".to_string(), json!(40)),
            ("smoothness".to_string(), json!(0.5)),
        ]),
        schema: vec![
            color_setting("color", "Color"),
            px_setting("radius", "Radius", 8.0, 120.0, 1.0),
            px_setting("stroke", "Stroke", 1.0, 40.0, 1.0),
            number_setting("opacity", "Opacity", 0.0, 1.0, 0.01),
            number_setting("sensitivity", "Sensitivity", 0.2, 3.0, 0.05),
            px_setting("deformation", "Deformation", 0.0, 120.0, 1.0),
            number_setting("smoothness", "Smoothness", 0.0, 1.0, 0.01),
        ],
    }
}

fn static_ring() -> PluginManifest {
    PluginManifest {
        id: "builtin.static-ring".to_string(),
        name: "Static Ring".to_string(),
        kind: "overlay".to_string(),
        renderer: "builtin.staticRing".to_string(),
        enabled: false,
        order: 15,
        description: "DOM-rendered static circular overlay.".to_string(),
        settings: Map::from_iter([
            ("color".to_string(), json!("")),
            ("radius".to_string(), json!(36)),
            ("stroke".to_string(), json!(8)),
            ("opacity".to_string(), json!(0.8)),
        ]),
        schema: vec![
            color_setting("color", "Color"),
            px_setting("radius", "Radius", 4.0, 160.0, 1.0),
            px_setting("stroke", "Stroke", 1.0, 40.0, 1.0),
            number_setting("opacity", "Opacity", 0.0, 1.0, 0.01),
        ],
    }
}

fn fullscreen_reference_lines() -> PluginManifest {
    PluginManifest {
        id: "builtin.fullscreen-reference-lines".to_string(),
        name: "Fullscreen Reference Lines".to_string(),
        kind: "guide".to_string(),
        renderer: "builtin.fullscreenReferenceLines".to_string(),
        enabled: true,
        order: 20,
        description: "Four center-axis guide lines that extend to the screen edges.".to_string(),
        settings: Map::from_iter([
            ("color".to_string(), json!("")),
            ("opacity".to_string(), json!(0.4)),
            ("lineWidth".to_string(), json!(16)),
            ("gap".to_string(), json!({ "value": 256, "unit": "px" })),
        ]),
        schema: vec![
            color_setting("color", "Color"),
            number_setting("opacity", "Opacity", 0.0, 1.0, 0.01),
            px_setting("lineWidth", "Line width", 1.0, 40.0, 1.0),
            length_setting(
                "gap",
                "Center gap",
                length_unit(256.0, 0.0, 320.0, 1.0),
                length_unit(10.0, 0.0, 100.0, 1.0),
            ),
        ],
    }
}

fn fullscreen_grid() -> PluginManifest {
    PluginManifest {
        id: "builtin.fullscreen-grid".to_string(),
        name: "Fullscreen Grid".to_string(),
        kind: "guide".to_string(),
        renderer: "builtin.fullscreenGrid".to_string(),
        enabled: true,
        order: 30,
        description: "A screen-wide grid aligned to the center of the display.".to_string(),
        settings: Map::from_iter([
            ("color".to_string(), json!("")),
            ("opacity".to_string(), json!(0.2)),
            ("spacing".to_string(), json!({ "value": 160, "unit": "px" })),
            ("lineWidth".to_string(), json!(1)),
        ]),
        schema: vec![
            color_setting("color", "Color"),
            number_setting("opacity", "Opacity", 0.0, 1.0, 0.01),
            length_setting(
                "spacing",
                "Spacing",
                length_unit(160.0, 16.0, 240.0, 1.0),
                length_unit(8.0, 1.0, 100.0, 1.0),
            ),
            px_setting("lineWidth", "Line width", 1.0, 12.0, 1.0),
        ],
    }
}

fn fullscreen_border() -> PluginManifest {
    PluginManifest {
        id: "builtin.fullscreen-border".to_string(),
        name: "Fullscreen Border".to_string(),
        kind: "guide".to_string(),
        renderer: "builtin.fullscreenBorder".to_string(),
        enabled: true,
        order: 40,
        description: "DOM-rendered full-screen border with adjustable thickness.".to_string(),
        settings: Map::from_iter([
            ("color".to_string(), json!("")),
            ("width".to_string(), json!(16)),
            ("opacity".to_string(), json!(0.6)),
        ]),
        schema: vec![
            color_setting("color", "Color"),
            px_setting("width", "Width", 1.0, 120.0, 1.0),
            number_setting("opacity", "Opacity", 0.0, 1.0, 0.01),
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::builtin_plugins;

    #[test]
    fn builtin_plugin_colors_follow_global_by_default() {
        for plugin in builtin_plugins() {
            assert_eq!(
                plugin
                    .settings
                    .get("color")
                    .and_then(|value| value.as_str()),
                Some(""),
                "{} should inherit the global overlay color",
                plugin.id
            );
        }
    }
}
