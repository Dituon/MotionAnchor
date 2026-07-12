import {
  Button,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  InputGroup,
  ListBox,
  Select,
  Slider,
  TextField,
  Typography,
  parseColor,
} from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { LengthUnit, LengthUnitConfig, LengthValue, PluginManifest } from "../plugins/types";

type PluginSettingEditorProps = {
  plugin: PluginManifest;
  setting: PluginManifest["schema"][number];
  onChange: (value: unknown) => void;
  inheritedColor: string;
};

export function PluginSettingEditor({
  inheritedColor,
  plugin,
  setting,
  onChange,
}: PluginSettingEditorProps) {
  const { t } = useTranslation();
  const value = plugin.settings[setting.key];
  const label = t(`pluginSettings.${setting.key}`, { defaultValue: setting.label });

  if (setting.kind === "color") {
    const colorValue = typeof value === "string" ? value : "";

    return (
      <ColorSettingEditor
        inheritedColor={inheritedColor}
        label={label}
        value={colorValue}
        onChange={onChange}
      />
    );
  }

  if (setting.kind === "number" || setting.kind === "px") {
    return (
      <NumericSettingEditor
        label={label}
        max={setting.max}
        min={setting.min}
        step={setting.step}
        unit={setting.kind === "px" ? "px" : undefined}
        value={typeof value === "number" ? value : 0}
        onChange={onChange}
      />
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
        label={label}
        options={options}
        settingKey={setting.key}
        value={selectedValue}
        onChange={onChange}
      />
    );
  }

  if (setting.kind === "length") {
    const lengthValue = normalizeLengthValue(value, setting);

    return (
      <LengthSettingEditor
        label={label}
        setting={setting}
        value={lengthValue}
        onChange={onChange}
      />
    );
  }

  return null;
}

function NumericSettingEditor({
  label,
  max,
  min,
  step,
  unit,
  value,
  onChange,
}: {
  label: string;
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
        aria-label={label}
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
        label={label}
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
  label,
  options,
  settingKey,
  value,
  onChange,
}: {
  label: string;
  options: NonNullable<PluginManifest["schema"][number]["options"]>;
  settingKey: string;
  value: string;
  onChange: (value: unknown) => void;
}) {
  const { t } = useTranslation();

  return (
    <Select
      aria-label={label}
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
  label,
  setting,
  value,
  onChange,
}: {
  label: string;
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
        aria-label={label}
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
        label={label}
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

function NumberInputGroup({
  label,
  max,
  min,
  step,
  unit,
  value,
  onChange,
  onToggleUnit,
}: {
  label: string;
  max?: number;
  min?: number;
  step?: number;
  unit?: LengthUnit;
  value: number;
  onChange: (value: unknown) => void;
  onToggleUnit?: () => void;
}) {
  return (
    <TextField aria-label={`${label} value`}>
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
              aria-label={`${label} unit`}
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

function ColorSettingEditor({
  label,
  inheritedColor,
  value,
  onChange,
}: {
  label: string;
  inheritedColor: string;
  value: string;
  onChange: (value: unknown) => void;
}) {
  const { t } = useTranslation();
  const color = parseColor(value || inheritedColor);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ColorPicker aria-label={label} value={color} onChange={(nextColor) => onChange(nextColor.toString("hex"))}>
        <ColorPicker.Trigger>
          <ColorSwatch aria-label={label} color={value || inheritedColor} size="sm" />
          <Typography.Code>{value || t("pluginSettings.followGlobal")}</Typography.Code>
        </ColorPicker.Trigger>
        <ColorPicker.Popover>
          <ColorArea aria-label={label} colorSpace="hsb" xChannel="saturation" yChannel="brightness">
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider aria-label={label} colorSpace="hsb" channel="hue">
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        </ColorPicker.Popover>
      </ColorPicker>
      <Button isDisabled={!value} size="sm" variant="secondary" onPress={() => onChange("")}>
        <RotateCcw aria-hidden="true" />
        {t("pluginSettings.followGlobal")}
      </Button>
    </div>
  );
}

function normalizeLengthValue(value: unknown, setting: PluginManifest["schema"][number]): LengthValue {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
