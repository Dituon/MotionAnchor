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

export type PluginSettingSchema = {
  key: string;
  label: string;
  kind: "color" | "length" | "number" | "px" | string;
  min?: number;
  max?: number;
  step?: number;
  length?: {
    px?: LengthUnitConfig;
    percent?: LengthUnitConfig;
  };
};

export type PluginManifest = {
  id: string;
  name: string;
  kind: string;
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

export type PluginApi = {
  motion: () => MotionFrame;
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

export type PluginRegistration = {
  id: string;
  name: string;
  kind: string;
  enabledByDefault: boolean;
  order: number;
  description: string;
  settings: Record<string, PluginSettingDefinition>;
  mount: PluginModule["mount"];
};
