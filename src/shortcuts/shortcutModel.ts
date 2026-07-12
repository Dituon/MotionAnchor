import { registeredPlugins } from "../plugins/registry";
import type { ShortcutAction, ShortcutBindingsPayload, ShortcutSettingsPayload } from "./types";

export function createShortcutSettings(payload: ShortcutBindingsPayload): ShortcutSettingsPayload {
  const actions: ShortcutAction[] = [
    action("overlay.show", "app", "show", null, payload.bindings),
    action("overlay.hide", "app", "hide", null, payload.bindings),
    action("overlay.toggle", "app", "toggle", null, payload.bindings),
  ];

  for (const plugin of registeredPlugins) {
    for (const operation of ["enable", "disable", "toggle"]) {
      actions.push(
        action(`plugin:${plugin.id}:${operation}`, "plugin", operation, plugin.id, payload.bindings),
      );
    }
  }

  return { actions };
}

function action(
  id: string,
  scope: ShortcutAction["scope"],
  operation: string,
  pluginId: string | null,
  bindings: Record<string, string[]>,
): ShortcutAction {
  return {
    id,
    scope,
    operation,
    pluginId,
    shortcuts: bindings[id] ?? [],
  };
}
