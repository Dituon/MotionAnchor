import { useEffect, useState } from "react";
import { Accordion, Card, Label, Separator, Tabs, ToggleButton, Typography } from "@heroui/react";
import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { AppPreferences } from "../preferences/types";
import type { PluginDirectoryPayload, PluginManifest } from "../plugins/types";
import {
  createGlobalPaint,
  defaultOverlayAppearance,
  getActiveOverlayPaint,
  getNextGlobalPaintId,
  applyOverlayAppearance,
  type OverlayAppearance,
} from "../overlay/appearance";
import type { Paint } from "./paint";
import { ShortcutSettings } from "../shortcuts/ShortcutSettings";
import { PluginSettingEditor } from "./PluginSettingEditor";
import { StartPage } from "./StartPage";
import { SystemSettings } from "./SystemSettings";
import { WindowTitleBar, type WindowTitleBarControls } from "./WindowTitleBar";
import type { SettingsRuntime } from "./settingsRuntime";

type SettingsSection = "start" | "plugins" | "shortcuts" | "system";

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
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("start");
  const [payload, setPayload] = useState<PluginDirectoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisibleState] = useState(true);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [overlayAppearance, setOverlayAppearanceState] = useState<OverlayAppearance>(defaultOverlayAppearance);

  const refresh = async () => {
    try {
      setError(null);
      setPayload(await runtime.loadPlugins());
    } catch (caught) {
      setError(String(caught));
    }
  };

  useEffect(() => {
    let unlistenPlugins: (() => void) | undefined;
    let unlistenOverlay: (() => void) | undefined;
    let unlistenAppearance: (() => void) | undefined;
    let cancelled = false;

    refresh();
    runtime
      .getOverlayAppearance()
      .then((appearance) => {
        if (!cancelled) {
          setOverlayAppearanceState(appearance);
          applyOverlayAppearance(appearance);
        }
      })
      .catch((caught) => setError(String(caught)));
    runtime
      .getOverlayVisible()
      .then(setOverlayVisibleState)
      .catch((caught) => setError(String(caught)));

    runtime
      .listenPluginsChanged(setPayload)
      .then((unlisten) => {
        unlistenPlugins = unlisten;
      })
      .catch((caught) => setError(String(caught)));
    runtime
      .listenOverlayVisible(setOverlayVisibleState)
      .then((unlisten) => {
        unlistenOverlay = unlisten;
      })
      .catch((caught) => setError(String(caught)));
    runtime
      .listenOverlayAppearance((appearance) => {
        setOverlayAppearanceState(appearance);
        applyOverlayAppearance(appearance);
      })
      .then((unlisten) => {
        unlistenAppearance = unlisten;
      })
      .catch((caught) => setError(String(caught)));

    return () => {
      cancelled = true;
      unlistenPlugins?.();
      unlistenOverlay?.();
      unlistenAppearance?.();
    };
  }, [runtime]);

  const updateOverlayVisible = async (visible: boolean) => {
    try {
      setOverlayBusy(true);
      setError(null);
      setOverlayVisibleState(await runtime.setOverlayVisible(visible));
    } catch (caught) {
      setError(String(caught));
    } finally {
      setOverlayBusy(false);
    }
  };

  const updateEnabled = async (plugin: PluginManifest, enabled: boolean) => {
    setPayload(await runtime.setPluginEnabled(plugin.id, enabled));
  };

  const updateSetting = async (plugin: PluginManifest, key: string, value: unknown) => {
    setPayload(await runtime.updatePluginSetting(plugin.id, key, value));
  };

  const updateGlobalAppearance = (update: Partial<OverlayAppearance> | ((appearance: OverlayAppearance) => OverlayAppearance)) => {
    setError(null);
    setOverlayAppearanceState((currentAppearance) => {
      const nextAppearance = typeof update === "function" ? update(currentAppearance) : { ...currentAppearance, ...update };

      runtime.setOverlayAppearance(nextAppearance).catch((caught) => setError(String(caught)));
      applyOverlayAppearance(nextAppearance);
      return nextAppearance;
    });
  };

  const selectGlobalPaint = (paintId: string) => updateGlobalAppearance({ activePaintId: paintId });
  const addGlobalPaint = () =>
    updateGlobalAppearance((currentAppearance) => {
      const id = getNextGlobalPaintId(currentAppearance.paints);
      const paint = createGlobalPaint(id, getActiveOverlayPaint(currentAppearance));

      return {
        ...currentAppearance,
        activePaintId: paint.id,
        paints: [...currentAppearance.paints, paint],
      };
    });
  const deleteGlobalPaint = (paintId: string) =>
    updateGlobalAppearance((currentAppearance) => {
      if (currentAppearance.paints.length <= 1) {
        return currentAppearance;
      }

      const deletedIndex = currentAppearance.paints.findIndex((paint) => paint.id === paintId);
      const paints = currentAppearance.paints.filter((paint) => paint.id !== paintId);
      const fallbackPaint = paints[Math.max(0, deletedIndex - 1)] ?? paints[0];

      return {
        ...currentAppearance,
        activePaintId: currentAppearance.activePaintId === paintId ? fallbackPaint.id : currentAppearance.activePaintId,
        paints,
      };
    });
  const updateActivePaint = (paint: Paint) =>
    updateGlobalAppearance((currentAppearance) => ({
      ...currentAppearance,
      paints: currentAppearance.paints.map((globalPaint) =>
        globalPaint.id === currentAppearance.activePaintId ? { ...globalPaint, paint } : globalPaint,
      ),
    }));

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <WindowTitleBar controls={windowControls} />

      {error && (
        <Card className="mx-3 shrink-0">
          <Card.Content>{error}</Card.Content>
        </Card>
      )}

      <ToggleButton
        className="mx-3 min-h-14 w-[calc(100%_-_1.5rem)] shrink-0 justify-center shadow-surface my-2"
        isDisabled={overlayBusy}
        isSelected={overlayVisible}
        size="lg"
        onChange={updateOverlayVisible}
      >
        <Layers aria-hidden="true" />
        {overlayVisible ? t("settings.overlayEnabled") : t("settings.overlayDisabled")}
      </ToggleButton>

      <Tabs
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        selectedKey={activeSection}
        onSelectionChange={(key) => setActiveSection(key as SettingsSection)}
        variant="secondary"
      >
        <Tabs.ListContainer className="z-10 shrink-0 bg-background">
          <Tabs.List aria-label={t("settings.title")}>
            <Tabs.Tab id="start" className="h-12">
              {t("nav.start")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="plugins" className="h-12">
              {t("nav.plugins")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="shortcuts" className="h-12">
              {t("nav.shortcuts")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="system" className="h-12">
              {t("nav.system")}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="start">
          <StartPage
            activePaint={getActiveOverlayPaint(overlayAppearance)}
            activePaintId={overlayAppearance.activePaintId}
            globalPaints={overlayAppearance.paints}
            opacity={overlayAppearance.opacity}
            onActivePaintChange={selectGlobalPaint}
            onGlobalPaintAdd={addGlobalPaint}
            onGlobalPaintDelete={deleteGlobalPaint}
            onOpacityChange={(opacity) => updateGlobalAppearance({ opacity })}
            onPaintChange={updateActivePaint}
          />
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="plugins">
          <PluginSettingsPanel
            globalPaint={getActiveOverlayPaint(overlayAppearance)}
            payload={payload}
            onUpdateEnabled={updateEnabled}
            onUpdateSetting={updateSetting}
          />
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="shortcuts">
          <ShortcutSettings plugins={payload?.plugins ?? []} runtime={runtime} />
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="system">
          <SystemSettings
            preferences={preferences}
            runtime={runtime}
            openExternalUrl={openExternalUrl}
          />
        </Tabs.Panel>
      </Tabs>
    </main>
  );
}

function PluginSettingsPanel({
  globalPaint,
  onUpdateEnabled,
  onUpdateSetting,
  payload,
}: {
  globalPaint: Paint;
  onUpdateEnabled: (plugin: PluginManifest, enabled: boolean) => void;
  onUpdateSetting: (plugin: PluginManifest, key: string, value: unknown) => void;
  payload: PluginDirectoryPayload | null;
}) {
  return (
    <Accordion allowsMultipleExpanded className="grid gap-2" variant="surface">
      {payload?.plugins.map((plugin) => (
        <PluginAccordionItem
          key={plugin.id}
          globalPaint={globalPaint}
          plugin={plugin}
          onUpdateEnabled={onUpdateEnabled}
          onUpdateSetting={onUpdateSetting}
        />
      ))}
    </Accordion>
  );
}

function PluginAccordionItem({
  globalPaint,
  onUpdateEnabled,
  onUpdateSetting,
  plugin,
}: {
  globalPaint: Paint;
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
