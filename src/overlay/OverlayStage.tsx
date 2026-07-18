import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import {
  getPluginEnvironment,
  pluginEnvironmentChangedEvent,
  type PluginEnvironment,
} from "../plugins/environment";
import { pluginModules, createPluginsPayload } from "../plugins/registry";
import { createPluginPaintApi } from "../plugins/runtimeSettings";
import type { PluginInstance, PluginManifest, PluginOverridesPayload } from "../plugins/types";
import { getOverlayVisible, loadPlugins, setInputEnabled, setPluginEnabled } from "../tauri/pluginCommands";
import type { InputVector2Payload } from "../tauri/types";
import { InputRuntime } from "../input/inputRuntime";
import {
  applyOverlayAppearance,
  defaultOverlayAppearance,
  getOverlayAppearance,
  overlayAppearanceChangedEvent,
  type OverlayAppearance,
} from "./appearance";

type MountedPlugin = {
  destroy: () => void;
  instance: PluginInstance;
  refresh: () => void;
  root: HTMLDivElement;
  setPlugin: (plugin: PluginManifest) => void;
  usesInput: () => boolean;
};

type PluginShortcutAction = {
  operation: "enable" | "disable" | "toggle";
  pluginId: string;
};

function pluginUsesInput(plugin: PluginManifest) {
  return plugin.schema.some((setting) => setting.kind === "vector2");
}

export function OverlayStage() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountedPluginsRef = useRef(new Map<string, MountedPlugin>());
  const pluginsRef = useRef<PluginManifest[]>([]);
  const environmentRef = useRef<PluginEnvironment>(getPluginEnvironment());
  const overlayAppearanceRef = useRef<OverlayAppearance>(defaultOverlayAppearance);
  const inputRuntimeRef = useRef(new InputRuntime());
  const requestFrameRef = useRef<() => void>(() => {});
  const overlayVisibleRef = useRef(true);
  const inputEnabledRef = useRef<boolean | null>(null);

  const syncInputSubscription = () => {
    const enabled =
      overlayVisibleRef.current &&
      Array.from(mountedPluginsRef.current.values()).some((mountedPlugin) => mountedPlugin.usesInput());

    if (inputEnabledRef.current === enabled) {
      return;
    }

    inputEnabledRef.current = enabled;
    setInputEnabled(enabled).catch((error) => {
      inputEnabledRef.current = null;
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

    const instance: PluginInstance =
      module.mount(root, {
        env: () => environmentRef.current,
        input: inputRuntimeRef.current.createPluginApi(() => currentPlugin.settings),
        paint: createPluginPaintApi({
          appearance: overlayAppearanceRef,
          getSettings: () => currentPlugin.settings,
          root,
          viewportElement: stage,
        }),
        plugin: () => currentPlugin,
        render: {
          request: () => requestFrameRef.current(),
        },
        settings: () => currentPlugin.settings,
      }) ?? {};

    mountedPluginsRef.current.set(plugin.id, {
      root,
      instance,
      refresh() {
        instance.updatePlugin?.(currentPlugin);
      },
      setPlugin(nextPlugin) {
        currentPlugin = nextPlugin;
        instance.updatePlugin?.(currentPlugin);
        syncInputSubscription();
        requestFrameRef.current();
      },
      usesInput() {
        return pluginUsesInput(currentPlugin);
      },
      destroy() {
        instance.destroy?.();
        root.remove();
      },
    });

    syncInputSubscription();
    requestFrameRef.current();
  };

  useEffect(() => {
    let cancelled = false;
    let animationId = 0;
    let frameScheduled = false;
    let unlistenInput: (() => void) | undefined;
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

    const draw = (time: number) => {
      frameScheduled = false;
      let shouldContinue = false;

      for (const mountedPlugin of mountedPluginsRef.current.values()) {
        shouldContinue = mountedPlugin.instance.frame?.(time) === true || shouldContinue;
      }

      if (shouldContinue) {
        requestFrame();
      }
    };

    const applyAppearance = (appearance: OverlayAppearance) => {
      overlayAppearanceRef.current = appearance;
      applyOverlayAppearance(appearance);
      for (const mountedPlugin of mountedPluginsRef.current.values()) {
        mountedPlugin.refresh();
      }
      requestFrame();
    };

    const boot = async () => {
      let appearance = defaultOverlayAppearance;

      try {
        appearance = await getOverlayAppearance();
      } catch (error) {
        console.error(error);
      }

      if (cancelled) {
        return;
      }

      applyAppearance(
        overlayAppearanceRef.current === defaultOverlayAppearance ? appearance : overlayAppearanceRef.current,
      );
      await refreshPlugins();
    };

    requestFrameRef.current = requestFrame;
    boot().catch(console.error);
    getOverlayVisible()
      .then((visible) => {
        overlayVisibleRef.current = visible;
        syncInputSubscription();
      })
      .catch(console.error);
    requestFrame();

    listen<InputVector2Payload>("input-vector2", (event) => {
      inputRuntimeRef.current.pushVector2(event.payload);
      requestFrame();
    }).then((unlisten) => {
      unlistenInput = unlisten;
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
      syncInputSubscription();

      if (event.payload) {
        requestFrame();
      }
    }).then((unlisten) => {
      unlistenOverlay = unlisten;
    });

    listen<OverlayAppearance>(overlayAppearanceChangedEvent, (event) => {
      applyAppearance(event.payload);
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
      inputEnabledRef.current = false;
      setInputEnabled(false).catch(console.error);
      unlistenInput?.();
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

    syncInputSubscription();
    requestFrameRef.current();
  }, [plugins]);

  return <div className="overlay-stage" ref={stageRef} />;
}
