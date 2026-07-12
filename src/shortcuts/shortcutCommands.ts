import { invoke } from "@tauri-apps/api/core";

import { createShortcutSettings } from "./shortcutModel";
import type { ShortcutBindingsPayload } from "./types";

export { createShortcutSettings } from "./shortcutModel";

export async function getShortcutSettings() {
  return createShortcutSettings(await invoke<ShortcutBindingsPayload>("get_shortcut_settings"));
}

export async function setActionShortcuts(actionId: string, shortcuts: string[]) {
  return createShortcutSettings(await invoke<ShortcutBindingsPayload>("set_action_shortcuts", { actionId, shortcuts }));
}
