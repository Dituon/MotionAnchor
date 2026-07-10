import { invoke } from "@tauri-apps/api/core";

import type { ShortcutSettingsPayload } from "./types";

export function getShortcutSettings() {
  return invoke<ShortcutSettingsPayload>("get_shortcut_settings");
}

export function setActionShortcuts(actionId: string, shortcuts: string[]) {
  return invoke<ShortcutSettingsPayload>("set_action_shortcuts", { actionId, shortcuts });
}
