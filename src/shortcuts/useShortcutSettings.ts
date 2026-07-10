import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { getShortcutSettings, setActionShortcuts } from "./shortcutCommands";
import type { ShortcutSettingsPayload } from "./types";

export function useShortcutSettings() {
  const [payload, setPayload] = useState<ShortcutSettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getShortcutSettings().then(setPayload).catch((caught) => setError(String(caught)));
    listen<ShortcutSettingsPayload>("shortcuts-changed", (event) => setPayload(event.payload)).then((cleanup) => {
      unlisten = cleanup;
    });

    return () => unlisten?.();
  }, []);

  const update = async (actionId: string, shortcuts: string[]) => {
    try {
      setBusyAction(actionId);
      setError(null);
      setPayload(await setActionShortcuts(actionId, shortcuts));
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusyAction(null);
    }
  };

  return { busyAction, error, payload, update };
}
