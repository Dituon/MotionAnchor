import type {
  LengthValue,
  PluginDirectoryPayload,
  PluginManifest,
  PluginOverride,
  PluginOverridesPayload,
  PluginRegistration,
  PluginSettingDefinition,
} from "./types";

export function definePlugin(plugin: PluginRegistration) {
  return plugin;
}

export function colorSetting({ defaultValue = "" }: { defaultValue?: string } = {}): PluginSettingDefinition {
  return {
    defaultValue,
    kind: "color",
    label: "Color",
  };
}

export function numberSetting({
  defaultValue,
  label,
  max,
  min,
  step,
}: {
  defaultValue: number;
  label?: string;
  max: number;
  min: number;
  step: number;
}): PluginSettingDefinition {
  return {
    defaultValue,
    kind: "number",
    label: label ?? "Value",
    max,
    min,
    step,
  };
}

export function pxSetting({
  defaultValue,
  label,
  max,
  min,
  step,
}: {
  defaultValue: number;
  label?: string;
  max: number;
  min: number;
  step: number;
}): PluginSettingDefinition {
  return {
    defaultValue,
    kind: "px",
    label: label ?? "Size",
    max,
    min,
    step,
  };
}

export function lengthSetting({
  defaultValue,
  label,
  percent,
  px,
}: {
  defaultValue: LengthValue;
  label?: string;
  percent: { defaultValue: number; max: number; min: number; step: number };
  px: { max: number; min: number; step: number };
}): PluginSettingDefinition {
  return {
    defaultValue,
    kind: "length",
    label: label ?? "Length",
    length: {
      percent,
      px: {
        defaultValue: defaultValue.unit === "px" ? defaultValue.value : px.min,
        ...px,
      },
    },
  };
}

export function defaultSettings(plugin: PluginRegistration) {
  return Object.fromEntries(
    Object.entries(plugin.settings).map(([key, setting]) => [key, clone(setting.defaultValue)]),
  );
}

export function toPluginManifest(plugin: PluginRegistration, override?: PluginOverride): PluginManifest {
  return {
    id: plugin.id,
    name: plugin.name,
    kind: plugin.kind,
    enabled: override?.enabled ?? plugin.enabledByDefault,
    order: plugin.order,
    description: plugin.description,
    settings: {
      ...defaultSettings(plugin),
      ...(override?.settings ?? {}),
    },
    schema: Object.entries(plugin.settings).map(([key, setting]) => ({
      key,
      label: setting.label,
      kind: setting.kind,
      min: setting.min,
      max: setting.max,
      step: setting.step,
      length: setting.length,
    })),
  };
}

export function createPluginDirectoryPayload(
  plugins: PluginRegistration[],
  overrides: PluginOverridesPayload,
): PluginDirectoryPayload {
  return {
    root: overrides.root,
    plugins: plugins
      .map((plugin) => toPluginManifest(plugin, overrides.plugins[plugin.id]))
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name)),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
