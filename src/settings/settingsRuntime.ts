import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";

import { createPluginsPayload } from "../plugins/registry";
import type { PluginDirectoryPayload, PluginOverridesPayload, RawMousePayload } from "../plugins/types";
import type { OverlayAppearance } from "../overlay/appearance";
import { getOverlayAppearance, setOverlayAppearance } from "../overlay/appearance";
import type { ShortcutBindingsPayload, ShortcutSettingsPayload } from "../shortcuts/types";
import { createShortcutSettings, getShortcutSettings, setActionShortcuts } from "../shortcuts/shortcutCommands";
import {
  getOverlayVisible,
  getRawMouseDebug,
  loadPlugins,
  setOverlayVisible,
  setPluginEnabled,
  setRawMouseEnabled,
  updatePluginSetting,
} from "../tauri/pluginCommands";
import type { RawMouseDebugPayload } from "../tauri/types";

type Unlisten = () => void;

export type SettingsRuntime = {
  getAppVersion: () => Promise<string>;
  getOverlayAppearance: () => Promise<OverlayAppearance>;
  getRawMouseDebug: () => Promise<RawMouseDebugPayload>;
  getOverlayVisible: () => Promise<boolean>;
  getShortcutSettings: () => Promise<ShortcutSettingsPayload>;
  listenOverlayVisible: (handler: (visible: boolean) => void) => Promise<Unlisten>;
  listenPluginsChanged: (handler: (payload: PluginDirectoryPayload) => void) => Promise<Unlisten>;
  listenRawMouse: (handler: (payload: RawMousePayload) => void) => Promise<Unlisten>;
  listenShortcutsChanged: (handler: (payload: ShortcutSettingsPayload) => void) => Promise<Unlisten>;
  loadPlugins: () => Promise<PluginDirectoryPayload>;
  setActionShortcuts: (actionId: string, shortcuts: string[]) => Promise<ShortcutSettingsPayload>;
  setOverlayAppearance: (appearance: OverlayAppearance) => Promise<OverlayAppearance>;
  setOverlayVisible: (visible: boolean) => Promise<boolean>;
  setPluginEnabled: (id: string, enabled: boolean) => Promise<PluginDirectoryPayload>;
  setRawMouseEnabled: (enabled: boolean) => Promise<boolean>;
  updatePluginSetting: (id: string, key: string, value: unknown) => Promise<PluginDirectoryPayload>;
};

export const tauriSettingsRuntime: SettingsRuntime = {
  getAppVersion: getVersion,
  getOverlayAppearance: async () => getOverlayAppearance(),
  getRawMouseDebug,
  getOverlayVisible,
  getShortcutSettings,
  listenOverlayVisible: (handler) =>
    listen<boolean>("overlay-visibility-changed", (event) => handler(event.payload)),
  listenPluginsChanged: (handler) =>
    listen<PluginOverridesPayload>("plugins-changed", (event) => handler(createPluginsPayload(event.payload))),
  listenRawMouse: (handler) =>
    listen<RawMousePayload>("raw-mouse", (event) => handler(event.payload)),
  listenShortcutsChanged: (handler) =>
    listen<ShortcutBindingsPayload>("shortcuts-changed", (event) => handler(createShortcutSettings(event.payload))),
  loadPlugins,
  setActionShortcuts,
  setOverlayAppearance,
  setOverlayVisible,
  setPluginEnabled,
  setRawMouseEnabled,
  updatePluginSetting,
};
