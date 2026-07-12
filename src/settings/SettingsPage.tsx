import { useEffect, useState } from "react";
import { Accordion, Button, Card, Label, Separator, Tabs, ToggleButton, Typography } from "@heroui/react";
import { Layers } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";

import type { AppPreferences } from "../preferences/types";
import type { PluginDirectoryPayload, PluginManifest } from "../plugins/types";
import {
  getOverlayVisible,
  getRawMouseDebug,
  loadPlugins,
  setOverlayVisible,
  setPluginEnabled,
  updatePluginSetting,
} from "../tauri/pluginCommands";
import type { RawMouseDebugPayload } from "../tauri/types";
import {
  defaultOverlayAppearance,
  getOverlayAppearance,
  setOverlayAppearance,
  type OverlayAppearance,
} from "../overlay/appearance";
import { ShortcutSettings } from "../shortcuts/ShortcutSettings";
import { AboutPanel } from "./AboutPanel";
import { AppearanceSettings } from "./AppearanceSettings";
import { PluginSettingEditor } from "./PluginSettingEditor";
import { StartPage } from "./StartPage";
import { WindowTitleBar } from "./WindowTitleBar";

type SettingsSection = "start" | "plugins" | "shortcuts" | "appearance" | "about";

export function SettingsPage({ preferences }: { preferences: AppPreferences }) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("start");
  const [payload, setPayload] = useState<PluginDirectoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisibleState] = useState(true);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [overlayAppearance, setOverlayAppearanceState] = useState<OverlayAppearance>(getOverlayAppearance);
  const [rawMouseDebug, setRawMouseDebug] = useState<RawMouseDebugPayload | null>(null);
  const [appVersion, setAppVersion] = useState("0.1.0");

  const refresh = async () => {
    try {
      setError(null);
      setPayload(await loadPlugins());
    } catch (caught) {
      setError(String(caught));
    }
  };

  useEffect(() => {
    let unlistenPlugins: (() => void) | undefined;
    let unlistenOverlay: (() => void) | undefined;
    let cancelled = false;

    const refreshRawMouseDebug = () => {
      getRawMouseDebug()
        .then((debug) => {
          if (!cancelled) {
            setRawMouseDebug(debug);
          }
        })
        .catch((caught) => {
          if (!cancelled) {
            setRawMouseDebug({
              running: false,
              status: "error",
              message: String(caught),
              mouseCount: 0,
              keyboardCount: 0,
              joystickCount: 0,
              pollCount: 0,
              emptyPollCount: 0,
              eventCount: 0,
              lastEventAtMs: null,
              lastDx: 0,
              lastDy: 0,
              lastSpeed: 0,
              lastAcceleration: 0,
            });
          }
        });
    };

    refresh();
    refreshRawMouseDebug();
    getVersion()
      .then((version) => {
        if (!cancelled) {
          setAppVersion(version);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppVersion("0.1.0");
        }
      });
    const debugTimer = window.setInterval(refreshRawMouseDebug, 500);
    getOverlayVisible()
      .then(setOverlayVisibleState)
      .catch((caught) => setError(String(caught)));

    listen<PluginDirectoryPayload>("plugins-changed", (event) => {
      setPayload(event.payload);
    }).then((unlisten) => {
      unlistenPlugins = unlisten;
    });
    listen<boolean>("overlay-visibility-changed", (event) => {
      setOverlayVisibleState(event.payload);
    }).then((unlisten) => {
      unlistenOverlay = unlisten;
    });

    return () => {
      cancelled = true;
      window.clearInterval(debugTimer);
      unlistenPlugins?.();
      unlistenOverlay?.();
    };
  }, []);

  const updateOverlayVisible = async (visible: boolean) => {
    try {
      setOverlayBusy(true);
      setError(null);
      setOverlayVisibleState(await setOverlayVisible(visible));
    } catch (caught) {
      setError(String(caught));
    } finally {
      setOverlayBusy(false);
    }
  };

  const updateEnabled = async (plugin: PluginManifest, enabled: boolean) => {
    setPayload(await setPluginEnabled(plugin.id, enabled));
  };

  const updateSetting = async (plugin: PluginManifest, key: string, value: unknown) => {
    setPayload(await updatePluginSetting(plugin.id, key, value));
  };

  const updateGlobalAppearance = (appearance: Partial<OverlayAppearance>) => {
    setError(null);
    setOverlayAppearanceState((currentAppearance) => {
      const nextAppearance = {
        ...currentAppearance,
        ...appearance,
      };

      setOverlayAppearance(nextAppearance).catch((caught) => setError(String(caught)));
      return nextAppearance;
    });
  };

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <WindowTitleBar />

      {error && (
        <Card className="mx-3 shrink-0">
          <Card.Content>{error}</Card.Content>
        </Card>
      )}

      <ToggleButton
        className="mx-3 min-h-14 w-[calc(100%_-_1.5rem)] shrink-0 justify-center shadow-surface mb-2"
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
            <Tabs.Tab id="appearance" className="h-12">
              {t("nav.appearance")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="shortcuts" className="h-12">
              {t("nav.shortcuts")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="about" className="h-12">
              {t("nav.about")}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="start">
          <StartPage
            color={overlayAppearance.color || defaultOverlayAppearance.color}
            customColors={overlayAppearance.customColors}
            opacity={overlayAppearance.opacity}
            onColorChange={(color) => updateGlobalAppearance({ color })}
            onCustomColorsChange={(customColors) => updateGlobalAppearance({ customColors })}
            onOpacityChange={(opacity) => updateGlobalAppearance({ opacity })}
          />
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="plugins">
          <PluginSettingsPanel
            payload={payload}
            globalColor={overlayAppearance.color}
            onRefresh={refresh}
            onUpdateEnabled={updateEnabled}
            onUpdateSetting={updateSetting}
          />
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="appearance">
          <AppearanceSettings preferences={preferences} />
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="shortcuts">
          <ShortcutSettings plugins={payload?.plugins ?? []} />
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto p-3" id="about">
          <AboutPanel appVersion={appVersion} debug={rawMouseDebug} />
        </Tabs.Panel>
      </Tabs>
    </main>
  );
}

function PluginSettingsPanel({
  globalColor,
  onRefresh,
  onUpdateEnabled,
  onUpdateSetting,
  payload,
}: {
  globalColor: string;
  onRefresh: () => void;
  onUpdateEnabled: (plugin: PluginManifest, enabled: boolean) => void;
  onUpdateSetting: (plugin: PluginManifest, key: string, value: unknown) => void;
  payload: PluginDirectoryPayload | null;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Card className="mb-4">
        <Card.Header>
          <div>
            <Card.Title>{t("settings.overlayTitle")}</Card.Title>
            <Card.Description>
              {t("settings.rootLabel")}: {payload?.root ?? t("app.loadingPlugins")}
            </Card.Description>
          </div>
        </Card.Header>
        <Card.Footer>
          <Button variant="outline" onPress={onRefresh}>
            {t("common.refresh")}
          </Button>
        </Card.Footer>
      </Card>

      <Accordion allowsMultipleExpanded className="grid gap-2" variant="surface">
        {payload?.plugins.map((plugin) => (
          <PluginAccordionItem
            key={plugin.id}
            globalColor={globalColor}
            plugin={plugin}
            onUpdateEnabled={onUpdateEnabled}
            onUpdateSetting={onUpdateSetting}
          />
        ))}
      </Accordion>
    </>
  );
}

function PluginAccordionItem({
  globalColor,
  onUpdateEnabled,
  onUpdateSetting,
  plugin,
}: {
  globalColor: string;
  onUpdateEnabled: (plugin: PluginManifest, enabled: boolean) => void;
  onUpdateSetting: (plugin: PluginManifest, key: string, value: unknown) => void;
  plugin: PluginManifest;
}) {
  const { t } = useTranslation();
  const pluginName = t(`plugins.${plugin.id}.name`, { defaultValue: plugin.name });
  const pluginDescription = t(`plugins.${plugin.id}.description`, { defaultValue: plugin.description });

  return (
    <Accordion.Item id={plugin.id}>
      <Accordion.Heading>
        <div className="group w-full items-center gap-2">
          <Accordion.Trigger className="flex w-full min-w-0 text-left transition-colors">
            <span className="min-w-0 flex-1 w-full">
              <span className="block truncate font-medium">{pluginName}</span>
              <span className="block truncate text-xs text-muted">
                {plugin.kind} / {plugin.id}
              </span>
            </span>
            <ToggleButton
              className="mx-4 border-2 border-transparent group-hover:border-muted"
              isSelected={plugin.enabled}
              onChange={(enabled) => onUpdateEnabled(plugin, enabled)}
            >
              {plugin.enabled ? t("common.enabled") : t("common.disabled")}
            </ToggleButton>
            <Accordion.Indicator />
          </Accordion.Trigger>
        </div>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="grid gap-3 px-2 pb-2 pt-3">
          <Typography.Paragraph>{pluginDescription}</Typography.Paragraph>
          {plugin.schema.map((setting) => (
            <div className="grid gap-2" key={setting.key}>
              <Separator />
              <Label>{t(`pluginSettings.${setting.key}`, { defaultValue: setting.label })}</Label>
              <PluginSettingEditor
                plugin={plugin}
                setting={setting}
                inheritedColor={globalColor}
                onChange={(value) => onUpdateSetting(plugin, setting.key, value)}
              />
            </div>
          ))}
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
