use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    utils::config::Color,
    AppHandle, Emitter, Manager, Runtime, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

mod input;
mod plugins;
mod settings_store;
mod shortcuts;

const MENU_SHOW_CONFIG: &str = "show-config";
const MENU_TOGGLE_OVERLAY: &str = "toggle-overlay";
const MENU_QUIT: &str = "quit";
const OVERLAY_VISIBILITY_EVENT: &str = "overlay-visibility-changed";

#[derive(Default)]
struct AppState {
    overlay_visible: Mutex<bool>,
}

fn apply_overlay_window_style<R: Runtime>(window: &WebviewWindow<R>) -> tauri::Result<()> {
    window.set_background_color(Some(Color(0, 0, 0, 0)))?;
    window.set_fullscreen(true)?;
    window.set_decorations(false)?;
    window.set_resizable(false)?;
    window.set_shadow(false)?;
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    window.set_ignore_cursor_events(true)?;
    Ok(())
}

fn show_config_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("config")
        .ok_or_else(|| "Config window is not available".to_string())?;

    window.show().map_err(|error| error.to_string())?;
    window.unminimize().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

fn apply_overlay_visibility(app: &AppHandle, visible: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Overlay window is not available".to_string())?;

    if visible {
        apply_overlay_window_style(&window).map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
    } else {
        window.hide().map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn set_overlay_visibility_inner(
    app: &AppHandle,
    state: &AppState,
    visible: bool,
) -> Result<bool, String> {
    apply_overlay_visibility(app, visible)?;

    if !visible {
        app.state::<input::InputState>().stop();
    }

    if let Ok(mut current) = state.overlay_visible.lock() {
        *current = visible;
    }

    app.emit(OVERLAY_VISIBILITY_EVENT, visible)
        .map_err(|error| error.to_string())?;

    Ok(visible)
}

#[tauri::command]
fn get_overlay_visible(state: State<'_, AppState>) -> bool {
    state
        .overlay_visible
        .lock()
        .map(|visible| *visible)
        .unwrap_or(true)
}

#[tauri::command]
fn set_overlay_visible(
    app: AppHandle,
    state: State<'_, AppState>,
    visible: bool,
) -> Result<bool, String> {
    set_overlay_visibility_inner(&app, &state, visible)
}

#[tauri::command]
fn show_config(app: AppHandle) -> Result<(), String> {
    show_config_window(&app)
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_config = MenuItem::with_id(app, MENU_SHOW_CONFIG, "Show Config", true, None::<&str>)?;
    let toggle_overlay = MenuItem::with_id(
        app,
        MENU_TOGGLE_OVERLAY,
        "Toggle Overlay",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, MENU_QUIT, "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_config, &toggle_overlay, &quit])?;

    let mut tray = TrayIconBuilder::with_id("motion-anchor")
        .tooltip("MotionAnchor")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_SHOW_CONFIG => {
                let _ = show_config_window(app);
            }
            MENU_TOGGLE_OVERLAY => {
                let state = app.state::<AppState>();
                let next_visible = !state
                    .overlay_visible
                    .lock()
                    .map(|visible| *visible)
                    .unwrap_or(true);
                let _ = set_overlay_visibility_inner(app, &state, next_visible);
            }
            MENU_QUIT => {
                app.exit(0);
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }

    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            overlay_visible: Mutex::new(true),
        })
        .manage(input::InputState::default())
        .manage(shortcuts::ShortcutState::default())
        .invoke_handler(tauri::generate_handler![
            get_overlay_visible,
            set_overlay_visible,
            show_config,
            input::get_input_enabled,
            input::get_input_profile,
            input::set_input_enabled,
            input::set_input_profile,
            plugins::load_plugin_overrides,
            plugins::set_plugin_enabled,
            plugins::update_plugin_setting,
            shortcuts::get_shortcut_settings,
            shortcuts::set_action_shortcuts
        ])
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(shortcuts::handle_shortcut)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "config" => {
                api.prevent_close();
                let _ = window.hide();
            }
            tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                api.prevent_close();
                let app = window.app_handle();
                let state = app.state::<AppState>();
                let _ = set_overlay_visibility_inner(&app, &state, false);
            }
            tauri::WindowEvent::Focused(_) if window.label() == "main" => {
                if let Some(webview_window) = window.app_handle().get_webview_window("main") {
                    let _ = apply_overlay_window_style(&webview_window);
                }
            }
            _ => {}
        })
        .setup(|app| {
            setup_tray(app)?;
            if let Err(error) = shortcuts::initialize(app.handle()) {
                eprintln!("failed to initialize shortcuts: {error}");
            }

            if let Some(window) = app.get_webview_window("main") {
                apply_overlay_window_style(&window)?;
                window.show()?;
            }

            if app.get_webview_window("config").is_none() {
                WebviewWindowBuilder::new(
                    app,
                    "config",
                    WebviewUrl::App("index.html?window=config".into()),
                )
                .title("MotionAnchor Plugins")
                .inner_size(460.0, 720.0)
                .min_inner_size(420.0, 480.0)
                .max_inner_size(1200.0, 8000.0)
                .resizable(true)
                .decorations(false)
                .accept_first_mouse(true)
                .transparent(false)
                .visible(true)
                .build()?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
