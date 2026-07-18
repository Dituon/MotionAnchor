import {
  Button,
  InputGroup,
  ListBox,
  Select,
  Slider,
  TextField,
} from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { LengthUnit, LengthUnitConfig, LengthValue, PluginManifest } from "../plugins/types";
import { PaintInput, normalizePaint, type Paint } from "./paint";

type PluginSettingEditorProps = {
  inheritedPaint: Paint;
  plugin: PluginManifest;
  setting: PluginManifest["schema"][number];
  onChange: (value: unknown) => void;
};

export function PluginSettingEditor({
  inheritedPaint,
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
