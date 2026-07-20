import type {
  LengthValue,
  PositionValue,
  PluginEnumOption,
  PluginDirectoryPayload,
  PluginManifest,
  PluginPaintSettingDefinition,
  PluginOverride,
  PluginOverridesPayload,
  PluginRegistration,
  PluginSettingDefinition,
  PluginSettingVisibilityCondition,
} from "./types";
import { defaultSolidPaint, normalizeColorString } from "../settings/paint/paintUtils";
import type { Paint } from "../settings/paint/types";

export function definePlugin(plugin: PluginRegistration) {
  return plugin;
}

export function paintSetting({
  defaultValue = null,
  group,
  label,
  solidOnly = false,
  visibleWhen,
}: {
  defaultValue?: Paint | string | null;
  group?: string;
  label?: string;
  solidOnly?: boolean;
  visibleWhen?: PluginSettingVisibilityCondition;
} = {}): PluginPaintSettingDefinition {
  const normalizedDefaultValue =
    typeof defaultValue === "string"
      ? {
          type: "solid" as const,
          color: normalizeColorString(defaultValue) || defaultSolidPaint.color,
        }
      : defaultValue;

  return {
    defaultValue: normalizedDefaultValue,
    group,
    kind: "paint",
    label: label ?? "Paint",
    solidOnly,
    visibleWhen,
  };
}

export function numberSetting({
  defaultValue,
  group,
  label,
  max,
  min,
  step,
  visibleWhen,
}: {
  defaultValue: number;
  group?: string;
  label?: string;
  max: number;
  min: number;
  step: number;
  visibleWhen?: PluginSettingVisibilityCondition;
}): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "number",
    label: label ?? "Value",
    max,
    min,
    step,
    visibleWhen,
  };
}

export function pxSetting({
  defaultValue,
  group,
  label,
  max,
  min,
  step,
  visibleWhen,
}: {
  defaultValue: number;
  group?: string;
  label?: string;
  max: number;
  min: number;
  step: number;
  visibleWhen?: PluginSettingVisibilityCondition;
}): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "px",
    label: label ?? "Size",
    max,
    min,
    step,
    visibleWhen,
  };
}

export function enumSetting({
  defaultValue,
  group,
  label,
  options,
  visibleWhen,
}: {
  defaultValue: string;
  group?: string;
  label?: string;
  options: PluginEnumOption[];
  visibleWhen?: PluginSettingVisibilityCondition;
}): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "enum",
    label: label ?? "Option",
    options,
    visibleWhen,
  };
}

export function booleanSetting({
  defaultValue,
  group,
  label,
  visibleWhen,
}: {
  defaultValue: boolean;
  group?: string;
  label?: string;
  visibleWhen?: PluginSettingVisibilityCondition;
}): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "boolean",
    label: label ?? "Enabled",
    visibleWhen,
  };
}

export function vector2Setting({
  defaultValue,
  group,
  label,
  visibleWhen,
}: {
  defaultValue: string;
  group?: string;
  label?: string;
  visibleWhen?: PluginSettingVisibilityCondition;
}): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "vector2",
    label: label ?? "Input",
    visibleWhen,
  };
}

export function stringSetting({
  defaultValue,
  group,
  label,
  visibleWhen,
}: {
  defaultValue: string;
  group?: string;
  label?: string;
  visibleWhen?: PluginSettingVisibilityCondition;
}): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "string",
    label: label ?? "Text",
    visibleWhen,
  };
}

export function lengthSetting({
  defaultValue,
  group,
  label,
  percent,
  px,
  visibleWhen,
}: {
  defaultValue: LengthValue;
  group?: string;
  label?: string;
  percent: { defaultValue: number; max: number; min: number; step: number };
  px: { max: number; min: number; step: number };
  visibleWhen?: PluginSettingVisibilityCondition;
}): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "length",
    label: label ?? "Length",
    visibleWhen,
    length: {
      percent,
      px: {
        defaultValue: defaultValue.unit === "px" ? defaultValue.value : px.min,
        ...px,
      },
    },
  };
}

export function positionSetting(
  defaultValue: PositionValue,
  {
    group,
    label,
    visibleWhen,
  }: {
    group?: string;
    label?: string;
    visibleWhen?: PluginSettingVisibilityCondition;
  } = {},
): PluginSettingDefinition {
  return {
    defaultValue,
    group,
    kind: "position",
    label: label ?? "Position",
    position: { defaultValue },
    visibleWhen,
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
      group: setting.group,
      label: setting.label,
      kind: setting.kind,
      min: setting.min,
      max: setting.max,
      step: setting.step,
      solidOnly: setting.solidOnly,
      options: setting.options,
      visibleWhen: setting.visibleWhen,
      length: setting.length,
      position: setting.position,
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
