import { useEffect, useRef, useState } from "react";
import { animate, set, spring } from "animejs";

import {
  applyOverlayAppearance,
  defaultOverlayAppearance,
  type OverlayAppearance,
} from "@motion-anchor/app/overlay/appearance";
import { pluginModules } from "@motion-anchor/app/plugins/registry";
import { createPluginPaintApi } from "@motion-anchor/app/plugins/runtimeSettings";
import type { PluginEnvironment } from "@motion-anchor/app/plugins/environment";
import type { MotionFrame, PluginInstance, PluginManifest } from "@motion-anchor/app/plugins/types";
import type { SettingsRuntime } from "@motion-anchor/app/settings/settingsRuntime";

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

type MountedPlugin = {
  destroy: () => void;
  instance: PluginInstance;
  refresh: () => void;
  root: HTMLDivElement;
  setPlugin: (plugin: PluginManifest) => void;
};

type PendingMotion = {
  count: number;
  deviceId: number;
  dx: number;
  dy: number;
  timestampMs: number;
};

function pluginUsesRawMouse(instance: PluginInstance) {
  if (typeof instance.usesRawMouse === "function") {
    return instance.usesRawMouse();
  }

  return instance.usesRawMouse === true;
}

export function SiteOverlayPreview({ runtime }: { runtime: SettingsRuntime }) {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountedPluginsRef = useRef(new Map<string, MountedPlugin>());
  const environmentRef = useRef<PluginEnvironment>({ debug: false });
  const overlayAppearanceRef = useRef<OverlayAppearance>(defaultOverlayAppearance);
  const motionRef = useRef<MotionFrame>(emptyMotion);
  const overlayVisibleRef = useRef(true);
  const pendingRef = useRef<PendingMotion>({
    count: 0,
    deviceId: 0,
    dx: 0,
    dy: 0,
    timestampMs: 0,
  });
  const rawMouseEnabledRef = useRef<boolean | null>(null);
  const requestFrameRef = useRef<() => void>(() => {});
  const toggleExpandedRef = useRef<() => void>(() => {});

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
    runtime.setRawMouseEnabled(enabled).catch((error) => {
      rawMouseEnabledRef.current = null;
      console.error(error);
    });
  };

  useEffect(() => {
    let cancelled = false;
    let unlistenAppearance: (() => void) | undefined;
    let unlistenPlugins: (() => void) | undefined;
    let unlistenOverlay: (() => void) | undefined;

    const applyAppearance = (appearance: OverlayAppearance) => {
      overlayAppearanceRef.current = appearance;
      applyOverlayAppearance(appearance);
      for (const mountedPlugin of mountedPluginsRef.current.values()) {
        mountedPlugin.refresh();
      }
      requestFrameRef.current();
    };

    const boot = async () => {
      let appearance = defaultOverlayAppearance;

      try {
        appearance = await runtime.getOverlayAppearance();
      } catch (error) {
        console.error(error);
      }

      if (cancelled) {
        return;
      }

      applyAppearance(
        overlayAppearanceRef.current === defaultOverlayAppearance ? appearance : overlayAppearanceRef.current,
      );

      const payload = await runtime.loadPlugins();
      if (!cancelled) {
        setPlugins(payload.plugins);
      }
    };

    boot().catch(console.error);
    runtime.getPluginEnvironment().then((environment) => {
      if (!cancelled) {
        environmentRef.current = environment;
      }
    }).catch(console.error);
    runtime.getOverlayVisible().then((visible) => {
      if (!cancelled) {
        overlayVisibleRef.current = visible;
        setOverlayVisible(visible);
      }
    }).catch(console.error);
    runtime.listenPluginsChanged((payload) => setPlugins(payload.plugins)).then((unlisten) => {
      unlistenPlugins = unlisten;
    }).catch(console.error);
    runtime.listenOverlayVisible((visible) => {
      overlayVisibleRef.current = visible;
      setOverlayVisible(visible);
    }).then((unlisten) => {
      unlistenOverlay = unlisten;
    }).catch(console.error);
    runtime.listenOverlayAppearance((appearance) => {
      applyAppearance(appearance);
    }).then((unlisten) => {
      unlistenAppearance = unlisten;
    }).catch(console.error);

    return () => {
      cancelled = true;
      unlistenAppearance?.();
      unlistenPlugins?.();
      unlistenOverlay?.();
    };
  }, [runtime]);

  useEffect(() => {
    let animationFrame = 0;
    let frameScheduled = false;
    let unlistenRawMouse: (() => void) | undefined;

    const requestFrame = () => {
      if (frameScheduled) {
        return;
      }

      frameScheduled = true;
      animationFrame = requestAnimationFrame(draw);
    };

    const draw = (time: number) => {
      frameScheduled = false;
      let shouldContinue = false;
      const pending = pendingRef.current;

      if (pending.count > 0) {
        const previous = motionRef.current;
        const dtMs = Math.max(1, previous.lastAt === 0 ? 16.67 : time - previous.lastAt);
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
          lastAt: time,
        };

        pendingRef.current = {
          count: 0,
          deviceId: pending.deviceId,
          dx: 0,
          dy: 0,
          timestampMs: pending.timestampMs,
        };

        shouldContinue = true;
      }

      for (const mountedPlugin of mountedPluginsRef.current.values()) {
        mountedPlugin.instance.updateMotion?.(motionRef.current);
        shouldContinue = mountedPlugin.instance.frame?.(time) === true || shouldContinue;
      }

      if (shouldContinue) {
        requestFrame();
      }
    };

    requestFrameRef.current = requestFrame;
    runtime.listenRawMouse((payload) => {
      const pending = pendingRef.current;
      pending.deviceId = payload.deviceId;
      pending.dx += payload.dx;
      pending.dy += payload.dy;
      pending.count += 1;
      pending.timestampMs = payload.timestampMs;
      requestFrame();
    }).then((unlisten) => {
      unlistenRawMouse = unlisten;
    }).catch(console.error);
    requestFrame();

    return () => {
      cancelAnimationFrame(animationFrame);
      requestFrameRef.current = () => {};
      runtime.setRawMouseEnabled(false).catch(console.error);
      rawMouseEnabledRef.current = false;
      unlistenRawMouse?.();
    };
  }, [runtime]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const enabledPlugins = plugins
      .filter((plugin) => plugin.enabled && overlayVisible)
      .sort((left, right) => left.order - right.order);
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
        continue;
      }

      const root = document.createElement("div");
      const module = pluginModules[plugin.id];
      let currentPlugin = plugin;

      if (!module) {
        console.warn(`MotionAnchor plugin is not registered: ${plugin.id}`);
        continue;
      }

      root.className = "pointer-events-none absolute inset-0 h-full w-full";
      root.dataset.pluginId = plugin.id;
      stage.appendChild(root);

      const instance =
        module.mount(root, {
          env: () => environmentRef.current,
          motion: () => motionRef.current,
          paint: createPluginPaintApi({
            appearance: overlayAppearanceRef,
            getSettings: () => currentPlugin.settings,
            root,
            viewportElement: stage,
          }),
          plugin: () => currentPlugin,
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
          syncRawMouseSubscription();
          requestFrameRef.current();
        },
        destroy() {
          instance.destroy?.();
          root.remove();
        },
      });
    }

    for (const plugin of enabledPlugins) {
      const mountedPlugin = mountedPluginsRef.current.get(plugin.id);
      if (mountedPlugin) {
        stage.appendChild(mountedPlugin.root);
      }
    }
    syncRawMouseSubscription();
    requestFrameRef.current();
  }, [plugins, overlayVisible]);

  useEffect(() => {
    return () => {
      for (const mountedPlugin of mountedPluginsRef.current.values()) {
        mountedPlugin.destroy();
      }
      mountedPluginsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const anchor = anchorRef.current;
    const frame = frameRef.current;
    const backdrop = backdropRef.current;
    let frameAnimation: ReturnType<typeof animate> | undefined;
    let backdropAnimation: ReturnType<typeof animate> | undefined;
    let currentDock: "hero" | "trial" = "hero";
    let isExpanded = false;
    let transitionToken = 0;

    if (!anchor || !frame || !backdrop) {
      return;
    }

    const springEase = (open = false) =>
      spring({
        mass: 1,
        stiffness: open ? 150 : 175,
        damping: open ? 19 : 22,
        velocity: open ? 0.55 : 0.35,
      });

    const trialSlot = () => document.getElementById("trial-preview-slot");

    const dockRect = (dock: "hero" | "trial") => {
      const slot = dock === "trial" ? trialSlot() : null;

      return (slot ?? anchor).getBoundingClientRect();
    };

    const targetFromRect = (rect: DOMRect) => {
      const anchorRect = anchor.getBoundingClientRect();

      return {
        height: rect.height,
        translateX: rect.left - anchorRect.left,
        translateY: rect.top - anchorRect.top,
        width: rect.width,
      };
    };

    const floatFromCurrentRect = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();

      set(frame, {
        position: "absolute",
        left: "0px",
        top: "0px",
        transformOrigin: "0 0",
        translateX: `${frameRect.left - anchorRect.left}px`,
        translateY: `${frameRect.top - anchorRect.top}px`,
        width: `${frameRect.width}px`,
        height: `${frameRect.height}px`,
      });
    };

    const restoreClosedFlow = () => {
      set(frame, {
        position: "relative",
        left: "auto",
        top: "auto",
        width: "100%",
        height: "100%",
        translateX: "0px",
        translateY: "0px",
      });
    };

    const animateBackdrop = (dimmed: boolean) => {
      backdropAnimation?.cancel();
      backdropAnimation = animate(backdrop, {
        opacity: dimmed ? 0.08 : 1,
        duration: 620,
        ease: springEase(dimmed),
      });
    };

    const animateToDock = (dock: "hero" | "trial", force = false) => {
      if (!force && !isExpanded && currentDock === dock) {
        return;
      }

      currentDock = dock;
      isExpanded = false;
      setExpanded(false);
      transitionToken += 1;
      const token = transitionToken;
      frameAnimation?.cancel();

      floatFromCurrentRect();
      animateBackdrop(false);

      const target = targetFromRect(dockRect(dock));

      frameAnimation = animate(frame, {
        translateX: `${target.translateX}px`,
        translateY: `${target.translateY}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
        opacity: 1,
        borderRadius: "8px",
        boxShadow: "0 32px 80px rgba(0,0,0,.28)",
        duration: 620,
        ease: springEase(),
      });
      frameAnimation.then(() => {
        if (token === transitionToken && dock === "hero") {
          restoreClosedFlow();
        }
      });
    };

    const setFullscreen = (nextExpanded: boolean) => {
      isExpanded = nextExpanded;
      setExpanded(isExpanded);
      transitionToken += 1;
      const token = transitionToken;
      frameAnimation?.cancel();
      floatFromCurrentRect();

      if (!nextExpanded) {
        const target = targetFromRect(dockRect(currentDock));

        animateBackdrop(false);
        frameAnimation = animate(frame, {
          translateX: `${target.translateX}px`,
          translateY: `${target.translateY}px`,
          width: `${target.width}px`,
          height: `${target.height}px`,
          borderRadius: "8px",
          boxShadow: "0 32px 80px rgba(0,0,0,.28)",
          duration: 620,
          ease: springEase(),
        });
        frameAnimation.then(() => {
          if (token === transitionToken && currentDock === "hero") {
            restoreClosedFlow();
          }
        });
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;

      animateBackdrop(true);
      frameAnimation = animate(frame, {
        translateX: `${-anchorRect.left}px`,
        translateY: `${-anchorRect.top}px`,
        width: `${viewportWidth}px`,
        height: `${viewportHeight}px`,
        borderRadius: "0px",
        boxShadow: "0 0px 0px rgba(0,0,0,0)",
        duration: 620,
        ease: springEase(true),
      });
    };

    const toggleFullscreen = () => setFullscreen(!isExpanded);

    const setupFrame = () => {
      frameAnimation?.cancel();
      backdropAnimation?.cancel();

      set(frame, {
        position: "relative",
        zIndex: 30,
        transformOrigin: "0 0",
        opacity: 1,
        translateX: "0px",
        translateY: "0px",
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        boxShadow: "0 32px 80px rgba(0,0,0,.28)",
      });
      set(backdrop, { opacity: 1 });
    };

    const isTrialDockActive = () => {
      const slot = trialSlot();

      return slot ? slot.getBoundingClientRect().bottom <= window.innerHeight : false;
    };

    const syncWithScroll = () => {
      animateToDock(isTrialDockActive() ? "trial" : "hero");
    };
    const handleScrollEnd = () => syncWithScroll();
    const handleScroll = () => syncWithScroll();

    setupFrame();
    toggleExpandedRef.current = toggleFullscreen;

    const refresh = () => {
      if (isExpanded) {
        setFullscreen(true);
        return;
      }

      animateToDock(currentDock, true);
    };

    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scrollend", handleScrollEnd);

    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scrollend", handleScrollEnd);
      frameAnimation?.revert();
      backdropAnimation?.revert();
      toggleExpandedRef.current = () => {};
    };
  }, []);

  return (
    <div ref={anchorRef} className="relative aspect-[16/10] w-[min(100%,38rem)] overflow-visible">
      <div
        aria-label={expanded ? "Shrink overlay preview" : "Enlarge overlay preview"}
        aria-pressed={expanded}
        onClick={() => toggleExpandedRef.current()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleExpandedRef.current();
          }
        }}
        ref={frameRef}
        role="button"
        tabIndex={0}
        className={`pointer-events-auto relative h-full w-full overflow-hidden rounded-lg border border-foreground/15 outline-none ring-accent/40 transition-[filter] focus-visible:ring-2 ${expanded ? "cursor-zoom-out" : "cursor-zoom-in"}`}
      >
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-hover"
        />
        <div ref={stageRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-[var(--ma-overlay-opacity,1)]" />
      </div>
    </div>
  );
}
