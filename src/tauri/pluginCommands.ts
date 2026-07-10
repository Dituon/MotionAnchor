import { invoke } from "@tauri-apps/api/core";

import type { PluginDirectoryPayload } from "../plugins/types";
import type { RawMouseDebugPayload } from "./types";

export function loadPlugins() {
  return invoke<PluginDirectoryPayload>("list_plugins");
}

export function getOverlayVisible() {
  return invoke<boolean>("get_overlay_visible");
}

export function setOverlayVisible(visible: boolean) {
  return invoke<boolean>("set_overlay_visible", { visible });
}

export function setRawMouseEnabled(enabled: boolean) {
  return invoke<boolean>("set_raw_mouse_enabled", { enabled });
}

export function getRawMouseDebug() {
  return invoke<RawMouseDebugPayload>("get_raw_mouse_debug");
}

export function setPluginEnabled(id: string, enabled: boolean) {
  return invoke<PluginDirectoryPayload>("set_plugin_enabled", { id, enabled });
}

export function updatePluginSetting(id: string, key: string, value: unknown) {
  return invoke<PluginDirectoryPayload>("update_plugin_setting", { id, key, value });
}
