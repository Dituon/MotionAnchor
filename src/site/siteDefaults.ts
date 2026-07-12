import type { PluginOverridesPayload } from "../plugins/types";
import type { ShortcutBindingsPayload } from "../shortcuts/types";

export type SitePluginPreset = {
  id: string;
  label: string;
  themeColor: string;
  overrides: PluginOverridesPayload;
};

export const sitePluginPresets = [
  {
    id: "balanced",
    label: "Balanced",
    themeColor: "#4cd964",
    overrides: {
      root: "Balanced preview preset",
      plugins: {
        "builtin.directional-pull-ring": {
          enabled: true,
          settings: {
            color: "#4cd964",
            deformation: 40,
            opacity: 0.85,
            radius: 34,
            sensitivity: 1,
            smoothness: 0.5,
            stroke: 8,
          },
        },
        "builtin.static-ring": {
          enabled: false,
          settings: {
            color: "#4cd964",
            opacity: 0.3,
            radius: 60,
            stroke: 2,
          },
        },
        "builtin.fullscreen-reference-lines": {
          enabled: true,
          settings: {
            color: "#4cd964",
            gap: { value: 48, unit: "px" },
            lineWidth: 3,
            opacity: 0.45,
            shape: "cross",
          },
        },
        "builtin.fullscreen-grid": {
          enabled: true,
          settings: {
            centerFadeSize: { value: 14, unit: "%" },
            centerHiddenRadius: { value: 11, unit: "%" },
            color: "#4cd964",
            lineWidth: 1,
            opacity: 0.18,
            spacing: { value: 10, unit: "%" },
          },
        },
        "builtin.fullscreen-border": {
          enabled: true,
          settings: {
            color: "#4cd964",
            opacity: 0.65,
            width: 4,
          },
        },
      },
    },
  },
  {
    id: "focus-ring",
    label: "Focus ring",
    themeColor: "#30c7ff",
    overrides: {
      root: "Focus ring preview preset",
      plugins: {
        "builtin.directional-pull-ring": {
          enabled: true,
          settings: {
            color: "#30c7ff",
            deformation: 62,
            opacity: 0.95,
            radius: 42,
            sensitivity: 1.3,
            smoothness: 0.35,
            stroke: 10,
          },
        },
        "builtin.static-ring": {
          enabled: true,
          settings: {
            color: "#30c7ff",
            opacity: 0.38,
            radius: 68,
            stroke: 2,
          },
        },
        "builtin.fullscreen-reference-lines": {
          enabled: false,
          settings: {
            color: "#30c7ff",
            gap: { value: 24, unit: "%" },
            lineWidth: 2,
            opacity: 0.28,
            shape: "cross",
          },
        },
        "builtin.fullscreen-grid": {
          enabled: false,
          settings: {
            centerFadeSize: { value: 18, unit: "%" },
            centerHiddenRadius: { value: 16, unit: "%" },
            color: "#30c7ff",
            lineWidth: 1,
            opacity: 0.12,
            spacing: { value: 12, unit: "%" },
          },
        },
        "builtin.fullscreen-border": {
          enabled: false,
          settings: {
            color: "#30c7ff",
            opacity: 0.35,
            width: 3,
          },
        },
      },
    },
  },
  {
    id: "precision-grid",
    label: "Precision grid",
    themeColor: "#22d3ee",
    overrides: {
      root: "Precision grid preview preset",
      plugins: {
        "builtin.directional-pull-ring": {
          enabled: false,
          settings: {
            color: "#22d3ee",
            deformation: 28,
            opacity: 0.62,
            radius: 28,
            sensitivity: 0.85,
            smoothness: 0.72,
            stroke: 5,
          },
        },
        "builtin.static-ring": {
          enabled: true,
          settings: {
            color: "#007b85",
            opacity: 0.34,
            radius: 48,
            stroke: 2,
          },
        },
        "builtin.fullscreen-reference-lines": {
          enabled: true,
          settings: {
            color: "#007b85",
            gap: { value: 220, unit: "px" },
            lineWidth: 50,
            opacity: 0.62,
            shape: "cross",
          },
        },
        "builtin.fullscreen-grid": {
          enabled: true,
          settings: {
            centerFadeSize: { value: 9, unit: "%" },
            centerHiddenRadius: { value: 8, unit: "%" },
            color: "#22d3ee",
            lineWidth: 1,
            opacity: 0.32,
            spacing: { value: 6, unit: "%" },
          },
        },
        "builtin.fullscreen-border": {
          enabled: true,
          settings: {
            color: "#22d3ee",
            opacity: 0.35,
            width: 2,
          },
        },
      },
    },
  },
  {
    id: "x-frame",
    label: "X frame",
    themeColor: "#f59e0b",
    overrides: {
      root: "X frame preview preset",
      plugins: {
        "builtin.directional-pull-ring": {
          enabled: true,
          settings: {
            color: "#f59e0b",
            deformation: 54,
            opacity: 0.72,
            radius: 30,
            sensitivity: 1.05,
            smoothness: 0.58,
            stroke: 6,
          },
        },
        "builtin.static-ring": {
          enabled: false,
          settings: {
            color: "#f59e0b",
            opacity: 0.22,
            radius: 78,
            stroke: 2,
          },
        },
        "builtin.fullscreen-reference-lines": {
          enabled: true,
          settings: {
            color: "#f59e0b",
            gap: { value: 17, unit: "%" },
            lineWidth: 4,
            opacity: 0.58,
            shape: "x",
          },
        },
        "builtin.fullscreen-grid": {
          enabled: true,
          settings: {
            centerFadeSize: { value: 16, unit: "%" },
            centerHiddenRadius: { value: 20, unit: "%" },
            color: "#fbbf24",
            lineWidth: 1,
            opacity: 0.1,
            spacing: { value: 14, unit: "%" },
          },
        },
        "builtin.fullscreen-border": {
          enabled: true,
          settings: {
            color: "#f59e0b",
            opacity: 0.52,
            width: 6,
          },
        },
      },
    },
  },
  {
    id: "edge-alert",
    label: "Edge alert",
    themeColor: "#fb7185",
    overrides: {
      root: "Edge alert preview preset",
      plugins: {
        "builtin.directional-pull-ring": {
          enabled: true,
          settings: {
            color: "#fb7185",
            deformation: 74,
            opacity: 0.86,
            radius: 38,
            sensitivity: 1.55,
            smoothness: 0.42,
            stroke: 7,
          },
        },
        "builtin.static-ring": {
          enabled: false,
          settings: {
            color: "#fecdd3",
            opacity: 0.24,
            radius: 58,
            stroke: 3,
          },
        },
        "builtin.fullscreen-reference-lines": {
          enabled: false,
          settings: {
            color: "#fb7185",
            gap: { value: 20, unit: "%" },
            lineWidth: 3,
            opacity: 0.36,
            shape: "cross",
          },
        },
        "builtin.fullscreen-grid": {
          enabled: false,
          settings: {
            centerFadeSize: { value: 24, unit: "%" },
            centerHiddenRadius: { value: 18, unit: "%" },
            color: "#fb7185",
            lineWidth: 1,
            opacity: 0.1,
            spacing: { value: 12, unit: "%" },
          },
        },
        "builtin.fullscreen-border": {
          enabled: true,
          settings: {
            color: "#fb7185",
            opacity: 0.74,
            width: 10,
          },
        },
      },
    },
  },
] satisfies SitePluginPreset[];

export const sitePluginOverrides = sitePluginPresets[0].overrides;

export const siteShortcutBindings = {
  bindings: {},
} satisfies ShortcutBindingsPayload;

export function createSitePluginOverrides(): PluginOverridesPayload {
  return clone(sitePluginOverrides);
}

export function createSiteShortcutBindings(): ShortcutBindingsPayload {
  return clone(siteShortcutBindings);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
