import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import {
  getPluginEnvironment,
  pluginEnvironmentChangedEvent,
  type PluginEnvironment,
} from "../plugins/environment";
import { pluginModules, createPluginsPayload } from "../plugins/registry";
import type {
  MotionFrame,
  PluginInstance,
  PluginManifest,
  PluginOverridesPayload,
  RawMousePayload,
} from "../plugins/types";
import { getOverlayVisible, loadPlugins, setPluginEnabled, setRawMouseEnabled } from "../tauri/pluginCommands";
import {
  applyOverlayAppearance,
  getOverlayAppearance,
  overlayAppearanceChangedEvent,
  type OverlayAppearance,
} from "./appearance";

const emptyMotion: MotionFrame = {
  deviceId: 0,
  dx: 0,
  dy: 0,
  dtMs: 16.67,
  speed: 0,
  acceleration: 0,
  timestampMs: 0,
  seq: 0,
  lastAt: 0,
};

type PendingMotion = {
  deviceId: number;
  dx: number;
  dy: number;
  count: number;
  timestampMs: number;
};

type MountedPlugin = {
  root: HTMLDivElement;
  instance: PluginInstance;
  setPlugin: (plugin: PluginManifest) => void;
  destroy: () => void;
};

type PluginShortcutAction = {
  operation: "enable" | "disable" | "toggle";
  pluginId: string;
};

function pluginUsesRawMouse(instance: PluginInstance) {
  if (typeof instance.usesRawMouse === "function") {
    return instance.usesRawMouse();
  }

  return instance.usesRawMouse === true;
}

export function OverlayStage() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountedPluginsRef = useRef(new Map<string, MountedPlugin>());
  const pluginsRef = useRef<PluginManifest[]>([]);
  const environmentRef = useRef<PluginEnvironment>(getPluginEnvironment());
  const motionRef = useRef<MotionFrame>(emptyMotion);
  const requestFrameRef = useRef<() => void>(() => {});
  const overlayVisibleRef = useRef(true);
  const rawMouseEnabledRef = useRef<boolean | null>(null);
  const pendingRef = useRef<PendingMotion>({
    deviceId: 0,
    dx: 0,
    dy: 0,
    count: 0,
    timestampMs: 0,
  });

  const syncRawMouseSubscription = () => {
    const enabled =
      overlayVisibleRef.current &&
      Array.from(mountedPluginsRef.current.values()).some((mountedPlugin) =>
        pluginUsesRawMouse(mountedPlugin.instance),
      );

    if (rawMouseEnabledRef.current === enabled) {
      return;
    }

    rawMouseEnabledRef.current = enabled;
    setRawMouseEnabled(enabled).catch((error) => {
      rawMouseEnabledRef.current = null;
      console.error(error);
    });
  };

  const mountPlugin = (plugin: PluginManifest) => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const root = document.createElement("div");
    const module = pluginModules[plugin.id];
    let currentPlugin = plugin;

    if (!module) {
      console.warn(`MotionAnchor plugin is not registered: ${plugin.id}`);
      return;
    }

    root.className = "plugin-host";
    root.dataset.pluginId = plugin.id;
    stage.appendChild(root);

    const instance =
      module.mount(root, {
        env: () => environmentRef.current,
        motion: () => motionRef.current,
        plugin: () => currentPlugin,
        settings: () => currentPlugin.settings,
      }) ?? {};

    mountedPluginsRef.current.set(plugin.id, {
      root,
      instance,
      setPlugin(nextPlugin) {
        currentPlugin = nextPlugin;
        instance.updatePlugin?.(nextPlugin);
        syncRawMouseSubscription();
        requestFrameRef.current();
      },
      destroy() {
        instance.destroy?.();
        root.remove();
      },
    });

    syncRawMouseSubscription();
    requestFrameRef.current();
  };

  useEffect(() => {
    let cancelled = false;
    let animationId = 0;
    let frameScheduled = false;
    let unlistenMouse: (() => void) | undefined;
    let unlistenPlugins: (() => void) | undefined;
    let unlistenPluginAction: (() => void) | undefined;
    let unlistenOverlay: (() => void) | undefined;
    let unlistenAppearance: (() => void) | undefined;
    let unlistenEnvironment: (() => void) | undefined;

    const refreshPlugins = async () => {
      const payload = await loadPlugins();
      if (!cancelled) {
        setPlugins(payload.plugins);
      }
    };

    const requestFrame = () => {
      if (cancelled || frameScheduled) {
        return;
      }

      frameScheduled = true;
      animationId = requestAnimationFrame(draw);
    };

    const draw = () => {
      frameScheduled = false;
      const now = performance.now();
      const pending = pendingRef.current;
      let shouldContinue = false;

      if (pending.count > 0) {
        const previous = motionRef.current;
        const dtMs = Math.max(1, previous.lastAt === 0 ? 16.67 : now - previous.lastAt);
        const distance = Math.hypot(pending.dx, pending.dy);
        const speed = distance / (dtMs / 1000);
        const acceleration = (speed - previous.speed) / (dtMs / 1000);

        motionRef.current = {
          deviceId: pending.deviceId,
          dx: pending.dx,
          dy: pending.dy,
          dtMs,
          speed,
          acceleration,
          timestampMs: pending.timestampMs,
          seq: previous.seq + 1,
          lastAt: now,
        };

        pendingRef.current = {
          deviceId: pending.deviceId,
          dx: 0,
          dy: 0,
          count: 0,
          timestampMs: pending.timestampMs,
        };

        shouldContinue = true;
      }

      for (const mountedPlugin of mountedPluginsRef.current.values()) {
        mountedPlugin.instance.updateMotion?.(motionRef.current);
        shouldContinue = mountedPlugin.instance.frame?.(now) === true || shouldContinue;
      }

      if (shouldContinue) {
        requestFrame();
      }
    };

    requestFrameRef.current = requestFrame;
    getOverlayAppearance()
      .then((appearance) => {
        if (!cancelled) {
          applyOverlayAppearance(appearance);
          requestFrame();
        }
      })
      .catch(console.error);
    refreshPlugins().catch(console.error);
    getOverlayVisible()
      .then((visible) => {
        overlayVisibleRef.current = visible;
        syncRawMouseSubscription();
      })
      .catch(console.error);
    requestFrame();

    listen<RawMousePayload>("raw-mouse", (event) => {
      const pending = pendingRef.current;
      pending.deviceId = event.payload.deviceId;
      pending.dx += event.payload.dx;
      pending.dy += event.payload.dy;
      pending.count += 1;
      pending.timestampMs = event.payload.timestampMs;
      requestFrame();
    }).then((unlisten) => {
      unlistenMouse = unlisten;
    });

    listen<PluginOverridesPayload>("plugins-changed", (event) => {
      setPlugins(createPluginsPayload(event.payload).plugins);
    }).then((unlisten) => {
      unlistenPlugins = unlisten;
    });

    listen<PluginShortcutAction>("plugin-shortcut-action", (event) => {
      const plugin = pluginsRef.current.find((candidate) => candidate.id === event.payload.pluginId);
      if (!plugin) {
        return;
      }

      const enabled =
        event.payload.operation === "toggle" ? !plugin.enabled : event.payload.operation === "enable";
      setPluginEnabled(plugin.id, enabled).then((payload) => setPlugins(payload.plugins)).catch(console.error);
    }).then((unlisten) => {
      unlistenPluginAction = unlisten;
    });

    listen<boolean>("overlay-visibility-changed", (event) => {
      overlayVisibleRef.current = event.payload;
      syncRawMouseSubscription();

      if (event.payload) {
        requestFrame();
      }
    }).then((unlisten) => {
      unlistenOverlay = unlisten;
    });

    listen<OverlayAppearance>(overlayAppearanceChangedEvent, (event) => {
      applyOverlayAppearance(event.payload);
      requestFrame();
    }).then((unlisten) => {
      unlistenAppearance = unlisten;
    });

    listen<PluginEnvironment>(pluginEnvironmentChangedEvent, (event) => {
      environmentRef.current = event.payload;
      requestFrame();
    }).then((unlisten) => {
      unlistenEnvironment = unlisten;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
      requestFrameRef.current = () => {};
      rawMouseEnabledRef.current = false;
      setRawMouseEnabled(false).catch(console.error);
      unlistenMouse?.();
      unlistenPlugins?.();
      unlistenPluginAction?.();
      unlistenOverlay?.();
      unlistenAppearance?.();
      unlistenEnvironment?.();
      for (const mountedPlugin of mountedPluginsRef.current.values()) {
        mountedPlugin.destroy();
      }
      mountedPluginsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    pluginsRef.current = plugins;
    const enabledPlugins = plugins.filter((plugin) => plugin.enabled);
    const enabledIds = new Set(enabledPlugins.map((plugin) => plugin.id));

    for (const [pluginId, mountedPlugin] of mountedPluginsRef.current) {
      if (!enabledIds.has(pluginId)) {
        mountedPlugin.destroy();
        mountedPluginsRef.current.delete(pluginId);
      }
    }

    for (const plugin of enabledPlugins) {
      const mountedPlugin = mountedPluginsRef.current.get(plugin.id);
      if (mountedPlugin) {
        mountedPlugin.setPlugin(plugin);
      } else {
        mountPlugin(plugin);
      }
    }

    const stage = stageRef.current;
    if (stage) {
      for (const plugin of enabledPlugins) {
        const mountedPlugin = mountedPluginsRef.current.get(plugin.id);
        if (mountedPlugin) {
          stage.appendChild(mountedPlugin.root);
        }
      }
    }

    syncRawMouseSubscription();
    requestFrameRef.current();
  }, [plugins]);

  return <div className="overlay-stage" ref={stageRef} />;
}
