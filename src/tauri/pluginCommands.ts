import { invoke } from "@tauri-apps/api/core";

import { createPluginsPayload } from "../plugins/registry";
import type { PluginDirectoryPayload, PluginOverridesPayload } from "../plugins/types";
import type { RawMouseDebugPayload } from "./types";

export async function loadPluginOverrides() {
  return invoke<PluginOverridesPayload>("load_plugin_overrides");
}

export async function loadPlugins() {
  return createPluginsPayload(await loadPluginOverrides());
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

export async function setPluginEnabled(id: string, enabled: boolean): Promise<PluginDirectoryPayload> {
  return createPluginsPayload(await invoke<PluginOverridesPayload>("set_plugin_enabled", { id, enabled }));
}

export async function updatePluginSetting(id: string, key: string, value: unknown): Promise<PluginDirectoryPayload> {
  return createPluginsPayload(await invoke<PluginOverridesPayload>("update_plugin_setting", { id, key, value }));
}
