import { useEffect } from "react";

import type { AppPreferences } from "../../preferences/types";
import { ShortcutSettings } from "../../shortcuts/ShortcutSettings";
import { StartPage } from "../StartPage";
import { SystemSettings } from "../SystemSettings";
import type { SettingsRuntime } from "../settingsRuntime";
import type { SettingsModel } from "../model/useSettingsModel";
import { PluginSettingsPage } from "../plugins/PluginSettingsPage";
import { pluginKindSectionId } from "../plugins/pluginKindNavigation";

export function SettingsWorkspace({
  model,
  openExternalUrl,
  preferences,
  runtime,
}: {
  model: SettingsModel;
  openExternalUrl?: (url: string) => void | Promise<void>;
  preferences: AppPreferences;
  runtime: SettingsRuntime;
}) {
  useEffect(() => {
    if (model.activeSection !== "plugins" || !model.pluginKindJump) {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(pluginKindSectionId(model.pluginKindJump!.kind))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [model.activeSection, model.pluginKindJump]);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
      {model.activeSection === "start" && (
        <StartPage
          activePaint={model.activePaint}
          activePaintId={model.activePaintId}
          globalPaints={model.globalPaints}
          opacity={model.overlayOpacity}
          onActivePaintChange={model.selectGlobalPaint}
          onGlobalPaintAdd={model.addGlobalPaint}
          onGlobalPaintDelete={model.deleteGlobalPaint}
          onOpacityChange={model.setOverlayOpacity}
          onPaintChange={model.updateActivePaint}
        />
      )}

      {model.activeSection === "plugins" && (
        <PluginSettingsPage
          globalPaint={model.activePaint}
          payload={model.pluginsPayload}
          onUpdateEnabled={model.updatePluginEnabled}
          onUpdateSetting={model.updatePluginSetting}
        />
      )}

      {model.activeSection === "shortcuts" && (
        <ShortcutSettings plugins={model.pluginsPayload?.plugins ?? []} runtime={runtime} />
      )}

      {model.activeSection === "system" && (
        <SystemSettings preferences={preferences} runtime={runtime} openExternalUrl={openExternalUrl} />
      )}
    </section>
  );
}
