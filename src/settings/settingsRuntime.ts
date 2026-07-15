import { getVersion } from "@tauri-apps/api/app";
import { emit, emitTo, listen } from "@tauri-apps/api/event";

import type { PluginEnvironment } from "../plugins/environment";
import { getPluginEnvironment, setPluginEnvironment } from "../plugins/environment";
import { createPluginsPayload } from "../plugins/registry";
import type { PluginDirectoryPayload, PluginOverridesPayload, RawMousePayload } from "../plugins/types";
import type { OverlayAppearance } from "../overlay/appearance";
import { getOverlayAppearance, overlayAppearanceChangedEvent, storeOverlayAppearance } from "../overlay/appearance";
import type { ShortcutBindingsPayload, ShortcutSettingsPayload } from "../shortcuts/types";
import { createShortcutSettings, getShortcutSettings, setActionShortcuts } from "../shortcuts/shortcutCommands";
import {
  getRawMouseEnabled,
  getOverlayVisible,
  getRawMouseSettings,
  loadPlugins,
  setOverlayVisible,
  setPluginEnabled,
  setRawMouseEnabled,
  setRawMouseSettings,
  updatePluginSetting,
} from "../tauri/pluginCommands";
import type { RawMouseSettingsPayload, RawMouseStatusPayload } from "../tauri/types";

type Unlisten = () => void;

export type SettingsRuntime = {
  getAppVersion: () => Promise<string>;
  getOverlayAppearance: () => Promise<OverlayAppearance>;
  getPluginEnvironment: () => Promise<PluginEnvironment>;
  getRawMouseEnabled: () => Promise<boolean>;
  getRawMouseSettings: () => Promise<RawMouseSettingsPayload>;
  getOverlayVisible: () => Promise<boolean>;
  getShortcutSettings: () => Promise<ShortcutSettingsPayload>;
  listenOverlayVisible: (handler: (visible: boolean) => void) => Promise<Unlisten>;
  listenOverlayAppearance: (handler: (appearance: OverlayAppearance) => void) => Promise<Unlisten>;
  listenPluginsChanged: (handler: (payload: PluginDirectoryPayload) => void) => Promise<Unlisten>;
  listenRawMouse: (handler: (payload: RawMousePayload) => void) => Promise<Unlisten>;
  listenRawMouseStatus: (handler: (payload: RawMouseStatusPayload) => void) => Promise<Unlisten>;
  listenShortcutsChanged: (handler: (payload: ShortcutSettingsPayload) => void) => Promise<Unlisten>;
  loadPlugins: () => Promise<PluginDirectoryPayload>;
  setActionShortcuts: (actionId: string, shortcuts: string[]) => Promise<ShortcutSettingsPayload>;
  setOverlayAppearance: (appearance: OverlayAppearance) => Promise<OverlayAppearance>;
  setOverlayVisible: (visible: boolean) => Promise<boolean>;
  setPluginEnvironment: (environment: PluginEnvironment) => Promise<PluginEnvironment>;
  setPluginEnabled: (id: string, enabled: boolean) => Promise<PluginDirectoryPayload>;
  setRawMouseEnabled: (enabled: boolean) => Promise<boolean>;
  setRawMouseSettings: (maxRefreshRateHz: number | null) => Promise<RawMouseSettingsPayload>;
  updatePluginSetting: (id: string, key: string, value: unknown) => Promise<PluginDirectoryPayload>;
};

export const tauriSettingsRuntime: SettingsRuntime = {
  getAppVersion: getVersion,
  getOverlayAppearance,
  getPluginEnvironment: async () => getPluginEnvironment(),
  getRawMouseEnabled,
  getRawMouseSettings,
  getOverlayVisible,
  getShortcutSettings,
  listenOverlayVisible: (handler) =>
    listen<boolean>("overlay-visibility-changed", (event) => handler(event.payload)),
  listenOverlayAppearance: (handler) =>
    listen<OverlayAppearance>(overlayAppearanceChangedEvent, (event) => handler(event.payload)),
  listenPluginsChanged: (handler) =>
    listen<PluginOverridesPayload>("plugins-changed", (event) => handler(createPluginsPayload(event.payload))),
  listenRawMouse: (handler) =>
    listen<RawMousePayload>("raw-mouse", (event) => handler(event.payload)),
  listenRawMouseStatus: (handler) =>
    listen<RawMouseStatusPayload>("raw-mouse-status", (event) => handler(event.payload)),
  listenShortcutsChanged: (handler) =>
    listen<ShortcutBindingsPayload>("shortcuts-changed", (event) => handler(createShortcutSettings(event.payload))),
  loadPlugins,
  setActionShortcuts,
  setOverlayAppearance: async (appearance) => {
    const nextAppearance = await storeOverlayAppearance(appearance);

    await Promise.all([
      emit(overlayAppearanceChangedEvent, nextAppearance).catch(console.error),
      emitTo("main", overlayAppearanceChangedEvent, nextAppearance).catch(console.error),
    ]);
    return nextAppearance;
  },
  setOverlayVisible,
  setPluginEnvironment,
  setPluginEnabled,
  setRawMouseEnabled,
  setRawMouseSettings,
  updatePluginSetting,
};
