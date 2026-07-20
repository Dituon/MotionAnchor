import {
  Button,
  InputGroup,
  ListBox,
  Select,
  Slider,
  Switch,
  TextField,
} from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { LengthUnit, LengthUnitConfig, LengthValue, PluginManifest, PositionValue } from "../plugins/types";
import type { InputProfilePayload } from "../tauri/types";
import { PaintInput, normalizePaint, type Paint } from "./paint";

type PluginSettingEditorProps = {
  inheritedPaint: Paint;
  inputProfile: InputProfilePayload | null;
  plugin: PluginManifest;
  setting: PluginManifest["schema"][number];
  onChange: (value: unknown) => void;
};

export function PluginSettingEditor({
  inheritedPaint,
  inputProfile,
  plugin,
  setting,
  onChange,
}: PluginSettingEditorProps) {
  const { t } = useTranslation();
  const value = plugin.settings[setting.key];
  const label = t(`pluginSettings.${setting.key}`, { defaultValue: setting.label });

  if (setting.kind === "paint") {
    const paintValue = parsePaintSettingValue(value);
    const isFollowingGlobal = !paintValue;

    return (
      <div className="grid gap-2">
        <PaintInput
          label={label}
          solidOnly={setting.solidOnly}
          value={paintValue ?? inheritedPaint}
          onChange={onChange}
        />
        <Button
          isDisabled={isFollowingGlobal}
          size="sm"
          variant="secondary"
          onPress={() => onChange(null)}
        >
          <RotateCcw aria-hidden="true" />
          {t("pluginSettings.followGlobal")}
        </Button>
      </div>
    );
  }

  if (setting.kind === "boolean") {
    return (
      <Switch
        size="lg"
        isSelected={typeof value === "boolean" ? value : false}
        onChange={onChange}
      >
        <Switch.Content className="flex w-full items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate">{t(value ? "common.enabled" : "common.disabled")}</span>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    );
  }

  if (setting.kind === "number" || setting.kind === "px") {
    return (
      <NumericSettingEditor
        max={setting.max}
        min={setting.min}
        step={setting.step}
        unit={setting.kind === "px" ? "px" : undefined}
        value={typeof value === "number" ? value : 0}
        onChange={onChange}
      />
    );
  }

  if (setting.kind === "string") {
    return (
      <TextField>
        <InputGroup fullWidth variant="secondary">
          <InputGroup.Input
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </InputGroup>
      </TextField>
    );
  }

  if (setting.kind === "enum") {
    const options = setting.options ?? [];
    const stringValue = typeof value === "string" ? value : "";
    const selectedValue = options.some((option) => option.value === stringValue)
      ? stringValue
      : (options[0]?.value ?? "");

    return (
      <EnumSettingEditor
        options={options}
        settingKey={setting.key}
        value={selectedValue}
        onChange={onChange}
      />
    );
  }

  if (setting.kind === "vector2") {
    const options = inputProfile?.vector2 ?? [];
    const stringValue = typeof value === "string" ? value : "";
    const selectedValue = options.some((option) => option.id === stringValue)
      ? stringValue
      : (options[0]?.id ?? "");

    return (
      <Select
        fullWidth
        value={selectedValue}
        variant="secondary"
        onChange={(nextValue) => {
          if (typeof nextValue === "string") {
            onChange(nextValue);
          }
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {options.map((option) => (
              <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    );
  }

  if (setting.kind === "length") {
    const lengthValue = normalizeLengthValue(value, setting);

    return (
      <LengthSettingEditor
        setting={setting}
        value={lengthValue}
        onChange={onChange}
      />
    );
  }

  if (setting.kind === "position") {
    return (
      <PositionSettingEditor
        value={normalizePositionValue(value, setting)}
        onChange={onChange}
      />
    );
  }

  return null;
}

function NumericSettingEditor({
  max,
  min,
  step,
  unit,
  value,
  onChange,
}: {
  max?: number;
  min?: number;
  step?: number;
  unit?: LengthUnit;
  value: number;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
      <Slider
        className="min-w-0"
        minValue={min}
        maxValue={max}
        step={step}
        value={value}
        onChange={(nextValue) => {
          if (typeof nextValue === "number") {
            onChange(nextValue);
          }
        }}
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      <NumberInputGroup
        max={max}
        min={min}
        step={step}
        unit={unit}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function EnumSettingEditor({
  options,
  settingKey,
  value,
  onChange,
}: {
  options: NonNullable<PluginManifest["schema"][number]["options"]>;
  settingKey: string;
  value: string;
  onChange: (value: unknown) => void;
}) {
  const { t } = useTranslation();

  return (
    <Select
      fullWidth
      value={value}
      variant="secondary"
      onChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onChange(nextValue);
        }
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => {
            const optionLabel = t(`pluginSettings.options.${settingKey}.${option.value}`, {
              defaultValue: option.label,
            });

            return (
              <ListBox.Item key={option.value} id={option.value} textValue={optionLabel}>
                {optionLabel}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            );
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function LengthSettingEditor({
  setting,
  value,
  onChange,
}: {
  setting: PluginManifest["schema"][number];
  value: LengthValue;
  onChange: (value: unknown) => void;
}) {
  const unit = value.unit === "px" ? "px" : "%";
  const unitConfig = getLengthUnitConfig(setting, unit);
  const update = (nextValue: Partial<LengthValue>) => onChange({ value: value.value, unit, ...nextValue });
  const toggleUnit = () => {
    const nextUnit = unit === "px" ? "%" : "px";
    update({ unit: nextUnit, value: getLengthUnitConfig(setting, nextUnit).defaultValue });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
      <Slider
        className="min-w-0"
        minValue={unitConfig.min}
        maxValue={unitConfig.max}
        step={unitConfig.step}
        value={value.value}
        onChange={(nextValue) => {
          if (typeof nextValue === "number") {
            update({ value: nextValue });
          }
        }}
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      <NumberInputGroup
        max={unitConfig.max}
        min={unitConfig.min}
        step={unitConfig.step}
        unit={unit}
        value={value.value}
        onChange={(nextValue) => update({ value: Number(nextValue) })}
        onToggleUnit={toggleUnit}
      />
    </div>
  );
}

function PositionSettingEditor({
  value,
  onChange,
}: {
  value: PositionValue;
  onChange: (value: unknown) => void;
}) {
  const updateAxis = (axis: keyof PositionValue, nextValue: Partial<LengthValue>) => {
    const current = value[axis];

    onChange({
      ...value,
      [axis]: { value: current.value, unit: current.unit, ...nextValue },
    });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <PositionAxisEditor
        axis="X"
        value={value.x}
        onChange={(nextValue) => updateAxis("x", { value: Number(nextValue) })}
        onToggleUnit={() => updateAxis("x", { unit: value.x.unit === "px" ? "%" : "px" })}
      />
      <PositionAxisEditor
        axis="Y"
        value={value.y}
        onChange={(nextValue) => updateAxis("y", { value: Number(nextValue) })}
        onToggleUnit={() => updateAxis("y", { unit: value.y.unit === "px" ? "%" : "px" })}
      />
    </div>
  );
}

function PositionAxisEditor({
  axis,
  value,
  onChange,
  onToggleUnit,
}: {
  axis: string;
  value: LengthValue;
  onChange: (value: unknown) => void;
  onToggleUnit: () => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm text-muted">{axis}</span>
      <Slider
        className="min-w-0"
        minValue={0}
        maxValue={getPositionSliderMax(axis, value.unit)}
        step={value.unit === "%" ? 0.1 : 1}
        value={clampNumber(value.value, 0, getPositionSliderMax(axis, value.unit))}
        onChange={(nextValue) => {
          if (typeof nextValue === "number") {
            onChange(nextValue);
          }
        }}
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      <NumberInputGroup
        unit={value.unit}
        value={value.value}
        onChange={onChange}
        onToggleUnit={onToggleUnit}
      />
    </div>
  );
}

function NumberInputGroup({
  max,
  min,
  step,
  unit,
  value,
  onChange,
  onToggleUnit,
}: {
  max?: number;
  min?: number;
  step?: number;
  unit?: LengthUnit;
  value: number;
  onChange: (value: unknown) => void;
  onToggleUnit?: () => void;
}) {
  return (
    <TextField>
      <InputGroup fullWidth variant="secondary">
        <InputGroup.Input
          className="w-full"
          max={max}
          min={min}
          step={step}
          type="number"
          value={String(value)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit ? (
          <InputGroup.Suffix className="pr-0">
            <Button
              isDisabled={!onToggleUnit}
              size="sm"
              variant="ghost"
              onPress={onToggleUnit}
            >
              {unit}
            </Button>
          </InputGroup.Suffix>
        ) : null}
      </InputGroup>
    </TextField>
  );
}

function normalizeLengthValue(value: unknown, setting: PluginManifest["schema"][number]): LengthValue {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value, unit: "px" };
  }

  if (isRecord(value)) {
    const numericValue = value.value;
    const unit = value.unit;

    if (typeof numericValue === "number" && Number.isFinite(numericValue) && isLengthUnit(unit)) {
      return { value: numericValue, unit };
    }
  }

  const pxConfig = getLengthUnitConfig(setting, "px");

  return { value: pxConfig.defaultValue, unit: "px" };
}

function normalizePositionValue(value: unknown, setting: PluginManifest["schema"][number]): PositionValue {
  const fallback = setting.position?.defaultValue ?? {
    x: { value: 0, unit: "px" },
    y: { value: 0, unit: "px" },
  };

  if (!isRecord(value)) {
    return fallback;
  }

  return {
    x: normalizePositionAxis(value.x, fallback.x),
    y: normalizePositionAxis(value.y, fallback.y),
  };
}

function normalizePositionAxis(value: unknown, fallback: LengthValue): LengthValue {
  if (!isRecord(value)) {
    return fallback;
  }

  const numericValue = value.value;
  const unit = value.unit;

  return typeof numericValue === "number" && Number.isFinite(numericValue) && isLengthUnit(unit)
    ? { value: numericValue, unit }
    : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPositionSliderMax(axis: string, unit: LengthUnit) {
  if (unit === "%") {
    return 100;
  }

  const viewport = axis === "X" ? window.innerWidth : window.innerHeight;

  return Math.max(1, viewport);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePaintSettingValue(value: unknown): Paint | null {
  if (isRecord(value) && typeof value.type === "string") {
    return normalizePaint(value as unknown as Paint);
  }

  return null;
}

function isLengthUnit(value: unknown): value is LengthUnit {
  return value === "%" || value === "px";
}

function getLengthUnitConfig(setting: PluginManifest["schema"][number], unit: LengthUnit): LengthUnitConfig {
  const configured = unit === "px" ? setting.length?.px : setting.length?.percent;

  if (configured) {
    return configured;
  }

  return unit === "px"
    ? { defaultValue: 0, min: 0, max: 320, step: 1 }
    : { defaultValue: 0, min: 0, max: 100, step: 1 };
}
