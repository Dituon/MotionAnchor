import { Card } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PluginDirectoryPayload, PluginManifest } from "../../plugins/types";
import type { InputProfilePayload } from "../../tauri/types";
import type { Paint } from "../paint";
import { PluginKindSection } from "./PluginKindSection";
import { pluginKindRoutes } from "./pluginKindNavigation";

export function PluginSettingsPage({
  globalPaint,
  inputProfile,
  onUpdateEnabled,
  onUpdateSetting,
  payload,
}: {
  globalPaint: Paint;
  inputProfile: InputProfilePayload | null;
  onUpdateEnabled: (plugin: PluginManifest, enabled: boolean) => void;
  onUpdateSetting: (plugin: PluginManifest, key: string, value: unknown) => void;
  payload: PluginDirectoryPayload | null;
}) {
  const { t } = useTranslation();

  if (!payload) {
    return (
      <Card>
        <Card.Content>{t("app.loadingPlugins")}</Card.Content>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {pluginKindRoutes.map((route) => (
        <PluginKindSection
          key={route.kind}
          globalPaint={globalPaint}
          inputProfile={inputProfile}
          kind={route.kind}
          plugins={payload.plugins.filter((plugin) => plugin.kind === route.kind)}
          onUpdateEnabled={onUpdateEnabled}
          onUpdateSetting={onUpdateSetting}
        />
      ))}
    </div>
  );
}
