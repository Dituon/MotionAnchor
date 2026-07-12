import { useEffect, useState } from "react";

import type { SettingsRuntime } from "../settings/settingsRuntime";
import { tauriSettingsRuntime } from "../settings/settingsRuntime";
import type { ShortcutSettingsPayload } from "./types";

export function useShortcutSettings(runtime: SettingsRuntime = tauriSettingsRuntime) {
  const [payload, setPayload] = useState<ShortcutSettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    runtime.getShortcutSettings().then(setPayload).catch((caught) => setError(String(caught)));
    runtime
      .listenShortcutsChanged(setPayload)
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch((caught) => setError(String(caught)));

    return () => unlisten?.();
  }, [runtime]);

  const update = async (actionId: string, shortcuts: string[]) => {
    try {
      setBusyAction(actionId);
      setError(null);
      setPayload(await runtime.setActionShortcuts(actionId, shortcuts));
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusyAction(null);
    }
  };

  return { busyAction, error, payload, update };
}
