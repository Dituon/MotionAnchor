import { getVersion } from "@tauri-apps/api/app";
import { emit, emitTo, listen } from "@tauri-apps/api/event";

import type { PluginEnvironment } from "../plugins/environment";
import { getPluginEnvironment, setPluginEnvironment } from "../plugins/environment";
import { createPluginsPayload } from "../plugins/registry";
import type { PluginDirectoryPayload, PluginOverridesPayload } from "../plugins/types";
import type { OverlayAppearance } from "../overlay/appearance";
import { getOverlayAppearance, overlayAppearanceChangedEvent, storeOverlayAppearance } from "../overlay/appearance";
import type { ShortcutBindingsPayload, ShortcutSettingsPayload } from "../shortcuts/types";
import { createShortcutSettings, getShortcutSettings, setActionShortcuts } from "../shortcuts/shortcutCommands";
import {
  getInputEnabled,
  getInputProfile,
  getOverlayVisible,
  loadPlugins,
  setOverlayVisible,
  setInputEnabled,
  setInputProfile,
  setPluginEnabled,
  updatePluginSetting,
} from "../tauri/pluginCommands";
import type { InputProfilePayload, InputStatusPayload, InputVector2Payload } from "../tauri/types";

type Unlisten = () => void;

export type SettingsRuntime = {
  getAppVersion: () => Promise<string>;
  getInputEnabled: () => Promise<boolean>;
  getInputProfile: () => Promise<InputProfilePayload>;
  getOverlayAppearance: () => Promise<OverlayAppearance>;
  getPluginEnvironment: () => Promise<PluginEnvironment>;
  getOverlayVisible: () => Promise<boolean>;
  getShortcutSettings: () => Promise<ShortcutSettingsPayload>;
  listenInputProfile: (handler: (payload: InputProfilePayload) => void) => Promise<Unlisten>;
  listenInputStatus: (handler: (payload: InputStatusPayload) => void) => Promise<Unlisten>;
  listenInputVector2: (handler: (payload: InputVector2Payload) => void) => Promise<Unlisten>;
  listenOverlayVisible: (handler: (visible: boolean) => void) => Promise<Unlisten>;
  listenOverlayAppearance: (handler: (appearance: OverlayAppearance) => void) => Promise<Unlisten>;
  listenPluginsChanged: (handler: (payload: PluginDirectoryPayload) => void) => Promise<Unlisten>;
  listenShortcutsChanged: (handler: (payload: ShortcutSettingsPayload) => void) => Promise<Unlisten>;
  loadPlugins: () => Promise<PluginDirectoryPayload>;
  setActionShortcuts: (actionId: string, shortcuts: string[]) => Promise<ShortcutSettingsPayload>;
  setInputEnabled: (enabled: boolean) => Promise<boolean>;
  setInputProfile: (profile: InputProfilePayload) => Promise<InputProfilePayload>;
  setOverlayAppearance: (appearance: OverlayAppearance) => Promise<OverlayAppearance>;
  setOverlayVisible: (visible: boolean) => Promise<boolean>;
  setPluginEnvironment: (environment: PluginEnvironment) => Promise<PluginEnvironment>;
  setPluginEnabled: (id: string, enabled: boolean) => Promise<PluginDirectoryPayload>;
  updatePluginSetting: (id: string, key: string, value: unknown) => Promise<PluginDirectoryPayload>;
};

export const tauriSettingsRuntime: SettingsRuntime = {
  getAppVersion: getVersion,
  getInputEnabled,
  getInputProfile,
  getOverlayAppearance,
  getPluginEnvironment: async () => getPluginEnvironment(),
  getOverlayVisible,
  getShortcutSettings,
  listenInputProfile: (handler) =>
    listen<InputProfilePayload>("input-profile-changed", (event) => handler(event.payload)),
  listenInputStatus: (handler) =>
    listen<InputStatusPayload>("input-status", (event) => handler(event.payload)),
  listenInputVector2: (handler) =>
    listen<InputVector2Payload>("input-vector2", (event) => handler(event.payload)),
  listenOverlayVisible: (handler) =>
    listen<boolean>("overlay-visibility-changed", (event) => handler(event.payload)),
  listenOverlayAppearance: (handler) =>
    listen<OverlayAppearance>(overlayAppearanceChangedEvent, (event) => handler(event.payload)),
  listenPluginsChanged: (handler) =>
    listen<PluginOverridesPayload>("plugins-changed", (event) => handler(createPluginsPayload(event.payload))),
  listenShortcutsChanged: (handler) =>
    listen<ShortcutBindingsPayload>("shortcuts-changed", (event) => handler(createShortcutSettings(event.payload))),
  loadPlugins,
  setActionShortcuts,
  setInputEnabled,
  setInputProfile,
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
  updatePluginSetting,
};
