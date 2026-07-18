import { invoke } from "@tauri-apps/api/core";

import { createPluginsPayload } from "../plugins/registry";
import type { PluginDirectoryPayload, PluginOverridesPayload } from "../plugins/types";
import type { InputProfilePayload } from "./types";

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

export function setInputEnabled(enabled: boolean) {
  return invoke<boolean>("set_input_enabled", { enabled });
}

export function getInputEnabled() {
  return invoke<boolean>("get_input_enabled");
}

export function getInputProfile() {
  return invoke<InputProfilePayload>("get_input_profile");
}

export function setInputProfile(profile: InputProfilePayload) {
  return invoke<InputProfilePayload>("set_input_profile", { profile });
}

export async function setPluginEnabled(id: string, enabled: boolean): Promise<PluginDirectoryPayload> {
  return createPluginsPayload(await invoke<PluginOverridesPayload>("set_plugin_enabled", { id, enabled }));
}

export async function updatePluginSetting(id: string, key: string, value: unknown): Promise<PluginDirectoryPayload> {
  return createPluginsPayload(await invoke<PluginOverridesPayload>("update_plugin_setting", { id, key, value }));
}
