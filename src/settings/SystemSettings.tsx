import { Card } from "@heroui/react";
import { useState } from "react";

import type { AppPreferences } from "../preferences/types";
import { AppInfoPanel } from "./AppInfoPanel";
import { AppearanceSettings } from "./AppearanceSettings";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import type { SettingsRuntime } from "./settingsRuntime";

export function SystemSettings({
  openExternalUrl,
  preferences,
  runtime,
}: {
  openExternalUrl?: (url: string) => void | Promise<void>;
  preferences: AppPreferences;
  runtime: SettingsRuntime;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      {error && (
        <Card>
          <Card.Content>{error}</Card.Content>
        </Card>
      )}
      <AppearanceSettings preferences={preferences} />
      <AppInfoPanel runtime={runtime} openExternalUrl={openExternalUrl} />
      <DiagnosticsPanel runtime={runtime} onError={setError} />
    </div>
  );
}
