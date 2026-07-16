import type { Paint } from "../settings/paint/types";

export type PaintRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PaintCoordinateSpace = "local" | "viewport";

export type PluginPaintOptions = {
  coordinateSpace?: PaintCoordinateSpace;
  fallback?: Paint;
};

export type PluginCanvasPaintOptions = PluginPaintOptions & {
  rect?: PaintRect;
};

export type PluginPaintApi = {
  applyBackground: (element: HTMLElement, key: string, options?: PluginPaintOptions) => void;
  canvasStyle: (
    ctx: CanvasRenderingContext2D,
    key: string,
    options?: PluginCanvasPaintOptions,
  ) => string | CanvasGradient;
  css: (key: string, options?: Pick<PluginPaintOptions, "fallback">) => string;
  setting: (key: string, fallback?: Paint) => Paint;
  viewportRect: () => PaintRect;
};

export type LengthUnit = "%" | "px";

export type LengthValue = {
  value: number;
  unit: LengthUnit;
};

export type LengthUnitConfig = {
  defaultValue: number;
  min: number;
  max: number;
  step: number;
};

export type PluginEnumOption = {
  label: string;
  value: string;
};

export type PluginSettingVisibilityCondition = {
  key: string;
  equals: unknown | unknown[];
};

export type PluginSettingSchema = {
  key: string;
  label: string;
  kind: "enum" | "length" | "number" | "paint" | "px" | string;
  min?: number;
  max?: number;
  step?: number;
  solidOnly?: boolean;
  options?: PluginEnumOption[];
  visibleWhen?: PluginSettingVisibilityCondition;
  length?: {
    px?: LengthUnitConfig;
    percent?: LengthUnitConfig;
  };
};

export const PluginKind = {
  Component: "component",
  Crosshair: "crosshair",
  Layout: "layout",
} as const;

export type PluginKind = (typeof PluginKind)[keyof typeof PluginKind];

export type PluginManifest = {
  id: string;
  name: string;
  kind: PluginKind;
  enabled: boolean;
  order: number;
  description: string;
  settings: Record<string, unknown>;
  schema: PluginSettingSchema[];
};

export type PluginDirectoryPayload = {
  root: string;
  plugins: PluginManifest[];
};

export type PluginOverride = {
  enabled?: boolean;
  settings?: Record<string, unknown>;
};

export type PluginOverridesPayload = {
  root: string;
  plugins: Record<string, PluginOverride>;
};

export type RawMousePayload = {
  deviceId: number;
  dx: number;
  dy: number;
  dtMs: number;
  speed: number;
  acceleration: number;
  timestampMs: number;
};

export type MotionFrame = RawMousePayload & {
  seq: number;
  lastAt: number;
};

export type PluginEnvironment = {
  debug: boolean;
};

export type PluginApi = {
  env: () => PluginEnvironment;
  motion: () => MotionFrame;
  paint: PluginPaintApi;
  plugin: () => PluginManifest;
  settings: () => Record<string, unknown>;
};

export type PluginInstance = {
  usesRawMouse?: boolean | (() => boolean);
  updatePlugin?: (plugin: PluginManifest) => void;
  updateMotion?: (motion: MotionFrame) => void;
  frame?: (timeMs: number) => boolean | void;
  destroy?: () => void;
};

export type PluginModule = {
  mount: (root: HTMLElement, api: PluginApi) => PluginInstance | void;
};

export type PluginSettingDefinition = Omit<PluginSettingSchema, "key"> & {
  defaultValue: unknown;
};

export type PluginPaintSettingDefinition = Omit<PluginSettingDefinition, "defaultValue" | "kind"> & {
  defaultValue: Paint | null;
  kind: "paint";
};

export type PluginRegistration = {
  id: string;
  name: string;
  kind: PluginKind;
  enabledByDefault: boolean;
  order: number;
  description: string;
  settings: Record<string, PluginSettingDefinition>;
  mount: PluginModule["mount"];
};
