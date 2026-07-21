import { createPluginsPayload } from "@motion-anchor/app/plugins/registry";
import type {
  PluginDirectoryPayload,
  PluginOverride,
  PluginOverridesPayload,
} from "@motion-anchor/app/plugins/types";
import {
  applyOverlayAppearance,
  defaultOverlayAppearance,
  type OverlayAppearance,
} from "@motion-anchor/app/overlay/appearance";
import type { PluginEnvironment } from "@motion-anchor/app/plugins/environment";
import type { SettingsRuntime } from "@motion-anchor/app/settings/settingsRuntime";
import { createShortcutSettings } from "@motion-anchor/app/shortcuts/shortcutModel";
import type { ShortcutBindingsPayload, ShortcutSettingsPayload } from "@motion-anchor/app/shortcuts/types";
import type { InputProfilePayload, InputStatusPayload, InputVector2Payload } from "@motion-anchor/app/tauri/types";
import { defaultInputProfile } from "@motion-anchor/app/input/defaultProfile";
import { createSitePluginOverrides, createSiteShortcutBindings, type SitePluginPreset } from "./siteDefaults";

export type DemoSettingsRuntime = SettingsRuntime & {
  applySitePluginPreset: (preset: SitePluginPreset) => Promise<PluginDirectoryPayload>;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clonePayload(payload: PluginDirectoryPayload): PluginDirectoryPayload {
  return {
    root: payload.root,
    plugins: payload.plugins.map((plugin) => cloneJson(plugin)),
  };
}

export function createDemoSettingsRuntime(): DemoSettingsRuntime {
  let overrides: PluginOverridesPayload = createSitePluginOverrides();
  let plugins = createPluginsPayload(overrides);
  let shortcutBindings: ShortcutBindingsPayload = createSiteShortcutBindings();
  let overlayAppearance: OverlayAppearance = defaultOverlayAppearance;
  let pluginEnvironment: PluginEnvironment = { debug: false };
  let overlayVisible = true;
  let inputEnabled = false;
  let inputListening = false;
  let inputProfile: InputProfilePayload = cloneJson(defaultInputProfile);
  let previousMouse: { x: number; y: number } | null = null;
  let emittedZero = true;
  const overlayListeners = new Set<(visible: boolean) => void>();
  const overlayAppearanceListeners = new Set<(appearance: OverlayAppearance) => void>();
  const inputProfileListeners = new Set<(payload: InputProfilePayload) => void>();
  const inputStatusListeners = new Set<(payload: InputStatusPayload) => void>();
  const inputVector2Listeners = new Set<(payload: InputVector2Payload) => void>();
  const pluginListeners = new Set<(payload: PluginDirectoryPayload) => void>();
  const shortcutListeners = new Set<(payload: ShortcutSettingsPayload) => void>();

  const emitPlugins = () => {
    const payload = clonePayload(plugins);
    pluginListeners.forEach((listener) => listener(payload));
    return payload;
  };

  const emitShortcuts = () => {
    const shortcuts = createShortcutSettings(shortcutBindings);
    shortcutListeners.forEach((listener) => listener(shortcuts));
    return shortcuts;
  };

  const updatePlugin = (id: string, update: (override: PluginOverride) => PluginOverride) => {
    overrides = {
      ...overrides,
      plugins: {
        ...overrides.plugins,
        [id]: update(overrides.plugins[id] ?? {}),
      },
    };
    plugins = createPluginsPayload(overrides);
    return emitPlugins();
  };

  const applyPluginPreset = (preset: SitePluginPreset) => {
    overrides = cloneJson(preset.overrides);
    plugins = createPluginsPayload(overrides);
    return emitPlugins();
  };

  const emitInputStatus = (status: InputStatusPayload) => {
    inputStatusListeners.forEach((listener) => listener(status));
  };

  const emitVector2 = (payload: InputVector2Payload) => {
    inputVector2Listeners.forEach((listener) => listener(payload));
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!inputEnabled) {
      return;
    }

    let dx = event.movementX;
    let dy = event.movementY;

    if ((!Number.isFinite(dx) || !Number.isFinite(dy)) && previousMouse) {
      dx = event.clientX - previousMouse.x;
      dy = event.clientY - previousMouse.y;
    }

    previousMouse = { x: event.clientX, y: event.clientY };

    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
      return;
    }

    emittedZero = false;
    emitVector2({ id: "look", x: dx, y: dy });
  };

  const startInput = () => {
    if (inputListening) {
      return;
    }

    previousMouse = null;
    emittedZero = true;
    inputListening = true;
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    emitInputStatus({ status: "listening", message: "Demo input stream started" });
  };

  const stopInput = () => {
    if (inputListening) {
      window.removeEventListener("mousemove", handleMouseMove);
      inputListening = false;
    }

    if (!emittedZero) {
      emitVector2({ id: "look", x: 0, y: 0 });
      emittedZero = true;
    }

    previousMouse = null;
    emitInputStatus({ status: "stopped", message: "Demo input stream stopped" });
  };

  return {
    getAppVersion: async () => "0.2.0 demo",
    getInputEnabled: async () => inputEnabled,
    getInputProfile: async () => cloneJson(inputProfile),
    getOverlayAppearance: async () => overlayAppearance,
    getPluginEnvironment: async () => pluginEnvironment,
    getOverlayVisible: async () => overlayVisible,
    getShortcutSettings: async () => createShortcutSettings(shortcutBindings),
    listenInputProfile: async (handler) => {
      inputProfileListeners.add(handler);
      return () => inputProfileListeners.delete(handler);
    },
    listenInputStatus: async (handler) => {
      inputStatusListeners.add(handler);
      return () => inputStatusListeners.delete(handler);
    },
    listenInputVector2: async (handler) => {
      inputVector2Listeners.add(handler);
      return () => inputVector2Listeners.delete(handler);
    },
    listenOverlayVisible: async (handler) => {
      overlayListeners.add(handler);
      return () => overlayListeners.delete(handler);
    },
    listenOverlayAppearance: async (handler) => {
      overlayAppearanceListeners.add(handler);
      return () => overlayAppearanceListeners.delete(handler);
    },
    listenPluginsChanged: async (handler) => {
      pluginListeners.add(handler);
      return () => pluginListeners.delete(handler);
    },
    listenShortcutsChanged: async (handler) => {
      shortcutListeners.add(handler);
      return () => shortcutListeners.delete(handler);
    },
    loadPlugins: async () => clonePayload(plugins),
    setActionShortcuts: async (actionId, nextShortcuts) => {
      shortcutBindings = {
        bindings: {
          ...shortcutBindings.bindings,
          [actionId]: nextShortcuts,
        },
      };

      return emitShortcuts();
    },
    applySitePluginPreset: async (preset) => applyPluginPreset(preset),
    setInputEnabled: async (enabled) => {
      inputEnabled = enabled;

      if (inputEnabled) {
        startInput();
      } else {
        stopInput();
      }

      return inputEnabled;
    },
    setInputProfile: async (profile) => {
      inputProfile = cloneJson(profile);
      inputProfileListeners.forEach((listener) => listener(cloneJson(inputProfile)));
      return cloneJson(inputProfile);
    },
    setOverlayAppearance: async (appearance) => {
      overlayAppearance = appearance;
      applyOverlayAppearance(overlayAppearance);
      overlayAppearanceListeners.forEach((listener) => listener(overlayAppearance));
      return overlayAppearance;
    },
    setOverlayVisible: async (visible) => {
      overlayVisible = visible;
      overlayListeners.forEach((listener) => listener(overlayVisible));
      return overlayVisible;
    },
    setPluginEnvironment: async (environment) => {
      pluginEnvironment = environment;
      return pluginEnvironment;
    },
    setPluginEnabled: async (id, enabled) => updatePlugin(id, (plugin) => ({ ...plugin, enabled })),
    updatePluginSetting: async (id, key, value) =>
      updatePlugin(id, (plugin) => ({
        ...plugin,
        settings: {
          ...plugin.settings,
          [key]: value,
        },
      })),
  };
}
