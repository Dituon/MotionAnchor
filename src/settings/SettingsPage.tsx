import type { AppPreferences } from "../preferences/types";
import { SettingsLayout } from "./layout/SettingsLayout";
import { useSettingsModel } from "./model/useSettingsModel";
import type { SettingsRuntime } from "./settingsRuntime";
import type { WindowTitleBarControls } from "./WindowTitleBar";

export function SettingsPage({
  openExternalUrl,
  preferences,
  runtime,
  windowControls,
}: {
  openExternalUrl?: (url: string) => void | Promise<void>;
  preferences: AppPreferences;
  runtime: SettingsRuntime;
  windowControls?: WindowTitleBarControls;
}) {
  const model = useSettingsModel(runtime);

  return (
    <SettingsLayout
      model={model}
      preferences={preferences}
      runtime={runtime}
      windowControls={windowControls}
      openExternalUrl={openExternalUrl}
    />
  );
}
