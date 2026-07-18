import { Accordion, Label, Separator, ToggleButton, Typography } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PluginManifest } from "../../plugins/types";
import type { InputProfilePayload } from "../../tauri/types";
import type { Paint } from "../paint";
import { PluginSettingEditor } from "../PluginSettingEditor";

export function PluginAccordionItem({
  globalPaint,
  inputProfile,
  onUpdateEnabled,
  onUpdateSetting,
  plugin,
}: {
  globalPaint: Paint;
  inputProfile: InputProfilePayload | null;
  onUpdateEnabled: (plugin: PluginManifest, enabled: boolean) => void;
  onUpdateSetting: (plugin: PluginManifest, key: string, value: unknown) => void;
  plugin: PluginManifest;
}) {
  const { t } = useTranslation();
  const pluginName = t(`plugins.${plugin.id}.name`, { defaultValue: plugin.name });
  const pluginDescription = t(`plugins.${plugin.id}.description`, { defaultValue: plugin.description });
  const pluginKind = t(`pluginKinds.${plugin.kind}`, { defaultValue: plugin.kind });

  return (
    <Accordion.Item id={plugin.id}>
      <Accordion.Heading>
        <div className="group flex w-full items-center gap-2">
          <Accordion.Trigger className="flex min-w-0 flex-1 text-left transition-colors">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{pluginName}</span>
              <span className="block truncate text-xs text-muted">
                {pluginKind} / {plugin.id}
              </span>
            </span>
            <Accordion.Indicator />
          </Accordion.Trigger>
          <ToggleButton
            className="mr-4 shrink-0 border-2 border-transparent group-hover:border-muted"
            isSelected={plugin.enabled}
            onChange={(enabled) => onUpdateEnabled(plugin, enabled)}
          >
            {plugin.enabled ? t("common.enabled") : t("common.disabled")}
          </ToggleButton>
        </div>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="grid gap-3 px-2 pb-2 pt-3">
          <Typography.Paragraph>{pluginDescription}</Typography.Paragraph>
          {plugin.schema
            .filter((setting) => isSettingVisible(plugin, setting))
            .map((setting) => (
              <div className="grid gap-2" key={setting.key}>
                <Separator />
                <Label>{t(`pluginSettings.${setting.key}`, { defaultValue: setting.label })}</Label>
                <PluginSettingEditor
                  inheritedPaint={globalPaint}
                  inputProfile={inputProfile}
                  plugin={plugin}
                  setting={setting}
                  onChange={(value) => onUpdateSetting(plugin, setting.key, value)}
                />
              </div>
            ))}
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function isSettingVisible(plugin: PluginManifest, setting: PluginManifest["schema"][number]) {
  const condition = setting.visibleWhen;

  if (!condition) {
    return true;
  }

  const value = plugin.settings[condition.key];
  const expectedValues = Array.isArray(condition.equals) ? condition.equals : [condition.equals];

  return expectedValues.some((expectedValue) => Object.is(expectedValue, value));
}
