import { createPluginsPayload } from "@motion-anchor/app/plugins/registry";
import type {
  PluginDirectoryPayload,
  PluginOverride,
  PluginOverridesPayload,
  RawMousePayload,
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
import type { RawMouseSettingsPayload, RawMouseStatusPayload } from "@motion-anchor/app/tauri/types";
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
  let rawMouseEnabled = false;
  let rawMouseListening = false;
  let rawMouseSettings: RawMouseSettingsPayload = {
    maxRefreshRateHz: null,
    defaultRefreshRateHz: 120,
    effectiveRefreshRateHz: 120,
  };
  let lastRawMouseAt = performance.now();
  let lastRawMouseSpeed = 0;
  let previousMouse: { x: number; y: number } | null = null;
  const overlayListeners = new Set<(visible: boolean) => void>();
  const overlayAppearanceListeners = new Set<(appearance: OverlayAppearance) => void>();
  const pluginListeners = new Set<(payload: PluginDirectoryPayload) => void>();
  const rawMouseListeners = new Set<(payload: RawMousePayload) => void>();
  const rawMouseStatusListeners = new Set<(payload: RawMouseStatusPayload) => void>();
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

  const handleRawMouseMove = (event: MouseEvent) => {
    if (!rawMouseEnabled) {
      return;
    }

    const time = performance.now();
    const dtMs = Math.max(1, time - lastRawMouseAt);
    lastRawMouseAt = time;

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

    const speed = Math.hypot(dx, dy) / (dtMs / 1000);
    const acceleration = (speed - lastRawMouseSpeed) / (dtMs / 1000);
    lastRawMouseSpeed = speed;

    const payload: RawMousePayload = {
      deviceId: 1,
      dx,
      dy,
      dtMs,
      speed,
      acceleration,
      timestampMs: Date.now(),
    };

    rawMouseListeners.forEach((listener) => listener(payload));
  };

  const startRawMouse = () => {
    if (rawMouseListening) {
      return;
    }

    lastRawMouseAt = performance.now();
    previousMouse = null;
    rawMouseListening = true;
    window.addEventListener("mousemove", handleRawMouseMove, { passive: true });
  };

  const stopRawMouse = () => {
    if (rawMouseListening) {
      window.removeEventListener("mousemove", handleRawMouseMove);
      rawMouseListening = false;
    }

    previousMouse = null;
  };

  return {
    getAppVersion: async () => "0.1.1 demo",
    getOverlayAppearance: async () => overlayAppearance,
    getPluginEnvironment: async () => pluginEnvironment,
    getRawMouseEnabled: async () => rawMouseEnabled,
    getRawMouseSettings: async () => rawMouseSettings,
    getOverlayVisible: async () => overlayVisible,
    getShortcutSettings: async () => createShortcutSettings(shortcutBindings),
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
    listenRawMouse: async (handler) => {
      rawMouseListeners.add(handler);
      return () => rawMouseListeners.delete(handler);
    },
    listenRawMouseStatus: async (handler) => {
      rawMouseStatusListeners.add(handler);
      return () => rawMouseStatusListeners.delete(handler);
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
    setRawMouseEnabled: async (enabled) => {
      rawMouseEnabled = enabled;

      if (rawMouseEnabled) {
        startRawMouse();
      } else {
        stopRawMouse();
      }

      return rawMouseEnabled;
    },
    setRawMouseSettings: async (maxRefreshRateHz) => {
      rawMouseSettings = {
        maxRefreshRateHz,
        defaultRefreshRateHz: 120,
        effectiveRefreshRateHz: maxRefreshRateHz ?? 120,
      };
      return rawMouseSettings;
    },
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
