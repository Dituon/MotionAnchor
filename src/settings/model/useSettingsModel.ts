import { useEffect, useState } from "react";

import {
  applyOverlayAppearance,
  createGlobalPaint,
  defaultOverlayAppearance,
  getActiveOverlayPaint,
  getNextGlobalPaintId,
  type OverlayAppearance,
} from "../../overlay/appearance";
import type { PluginDirectoryPayload, PluginKind, PluginManifest } from "../../plugins/types";
import type { Paint } from "../paint";
import type { SettingsRuntime } from "../settingsRuntime";
import type { PluginKindJump, SettingsSection } from "./settingsNavigation";

export type SettingsModel = {
  activePaint: Paint;
  activePaintId: string;
  activePluginKind: PluginKind | null;
  activeSection: SettingsSection;
  error: string | null;
  globalPaints: OverlayAppearance["paints"];
  overlayBusy: boolean;
  overlayOpacity: number;
  overlayVisible: boolean;
  pluginKindJump: PluginKindJump | null;
  pluginsPayload: PluginDirectoryPayload | null;
  addGlobalPaint: () => void;
  deleteGlobalPaint: (paintId: string) => void;
  selectGlobalPaint: (paintId: string) => void;
  selectPluginKind: (kind: PluginKind) => void;
  selectSection: (section: SettingsSection) => void;
  setOverlayOpacity: (opacity: number) => void;
  toggleOverlay: () => void;
  updateActivePaint: (paint: Paint) => void;
  updatePluginEnabled: (plugin: PluginManifest, enabled: boolean) => Promise<void>;
  updatePluginSetting: (plugin: PluginManifest, key: string, value: unknown) => Promise<void>;
};

export function useSettingsModel(runtime: SettingsRuntime): SettingsModel {
  const [activeSection, setActiveSection] = useState<SettingsSection>("start");
  const [activePluginKind, setActivePluginKind] = useState<PluginKind | null>(null);
  const [pluginKindJump, setPluginKindJump] = useState<PluginKindJump | null>(null);
  const [pluginsPayload, setPluginsPayload] = useState<PluginDirectoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisibleState] = useState(true);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [overlayAppearance, setOverlayAppearanceState] = useState<OverlayAppearance>(defaultOverlayAppearance);

  const refreshPlugins = async () => {
    try {
      setError(null);
      setPluginsPayload(await runtime.loadPlugins());
    } catch (caught) {
      setError(String(caught));
    }
  };

  useEffect(() => {
    let unlistenPlugins: (() => void) | undefined;
    let unlistenOverlay: (() => void) | undefined;
    let unlistenAppearance: (() => void) | undefined;
    let cancelled = false;

    refreshPlugins();
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
      .listenPluginsChanged(setPluginsPayload)
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

  const updateOverlayAppearance = (
    update: Partial<OverlayAppearance> | ((appearance: OverlayAppearance) => OverlayAppearance),
  ) => {
    setError(null);
    setOverlayAppearanceState((currentAppearance) => {
      const nextAppearance =
        typeof update === "function" ? update(currentAppearance) : { ...currentAppearance, ...update };

      runtime.setOverlayAppearance(nextAppearance).catch((caught) => setError(String(caught)));
      applyOverlayAppearance(nextAppearance);
      return nextAppearance;
    });
  };

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

  return {
    activePaint: getActiveOverlayPaint(overlayAppearance),
    activePaintId: overlayAppearance.activePaintId,
    activePluginKind,
    activeSection,
    error,
    globalPaints: overlayAppearance.paints,
    overlayBusy,
    overlayOpacity: overlayAppearance.opacity,
    overlayVisible,
    pluginKindJump,
    pluginsPayload,
    addGlobalPaint() {
      updateOverlayAppearance((currentAppearance) => {
        const id = getNextGlobalPaintId(currentAppearance.paints);
        const paint = createGlobalPaint(id, getActiveOverlayPaint(currentAppearance));

        return {
          ...currentAppearance,
          activePaintId: paint.id,
          paints: [...currentAppearance.paints, paint],
        };
      });
    },
    deleteGlobalPaint(paintId) {
      updateOverlayAppearance((currentAppearance) => {
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
    },
    selectGlobalPaint(paintId) {
      updateOverlayAppearance({ activePaintId: paintId });
    },
    selectPluginKind(kind) {
      setActiveSection("plugins");
      setActivePluginKind(kind);
      setPluginKindJump((currentJump) => ({
        kind,
        version: (currentJump?.version ?? 0) + 1,
      }));
    },
    selectSection(section) {
      setActiveSection(section);
      setActivePluginKind(null);
    },
    setOverlayOpacity(opacity) {
      updateOverlayAppearance({ opacity });
    },
    toggleOverlay() {
      void updateOverlayVisible(!overlayVisible);
    },
    updateActivePaint(paint) {
      updateOverlayAppearance((currentAppearance) => ({
        ...currentAppearance,
        paints: currentAppearance.paints.map((globalPaint) =>
          globalPaint.id === currentAppearance.activePaintId ? { ...globalPaint, paint } : globalPaint,
        ),
      }));
    },
    async updatePluginEnabled(plugin, enabled) {
      setPluginsPayload(await runtime.setPluginEnabled(plugin.id, enabled));
    },
    async updatePluginSetting(plugin, key, value) {
      setPluginsPayload(await runtime.updatePluginSetting(plugin.id, key, value));
    },
  };
}
