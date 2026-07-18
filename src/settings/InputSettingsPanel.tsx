import { Button, Card, InputGroup, Slider, TextField, ToggleButton, Typography } from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { defaultInputProfile } from "../input/defaultProfile";
import type { InputProfilePayload, Vector2InputSource } from "../tauri/types";

export function InputSettingsPanel({
  onProfileChange,
  profile,
}: {
  onProfileChange: (profile: InputProfilePayload) => void | Promise<void>;
  profile: InputProfilePayload | null;
}) {
  const { t } = useTranslation();
  const currentProfile = profile ?? defaultInputProfile;

  const updateSource = (inputId: string, sourceIndex: number, source: Vector2InputSource) => {
    void onProfileChange({
      vector2: currentProfile.vector2.map((binding) =>
        binding.id === inputId
          ? {
              ...binding,
              sources: binding.sources.map((candidate, index) => (index === sourceIndex ? source : candidate)),
            }
          : binding,
      ),
    });
  };

  return (
    <Card>
      <Card.Header>
        <div className="min-w-0">
          <Card.Title>{t("inputSettings.title")}</Card.Title>
          <Card.Description>{t("inputSettings.description")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4">
        {currentProfile.vector2.map((binding) => (
          <div className="grid gap-3" key={binding.id}>
            <div>
              <Typography.Paragraph className="font-medium">{binding.label}</Typography.Paragraph>
              <Typography.Code>{binding.id}</Typography.Code>
            </div>
            {binding.sources.map((source, sourceIndex) => (
              <SourceEditor
                key={`${binding.id}-${sourceIndex}`}
                source={source}
                onChange={(nextSource) => updateSource(binding.id, sourceIndex, nextSource)}
              />
            ))}
          </div>
        ))}
        <Button size="sm" variant="secondary" onPress={() => void onProfileChange(defaultInputProfile)}>
          <RotateCcw aria-hidden="true" />
          {t("inputSettings.reset")}
        </Button>
      </Card.Content>
    </Card>
  );
}

function SourceEditor({
  onChange,
  source,
}: {
  onChange: (source: Vector2InputSource) => void;
  source: Vector2InputSource;
}) {
  const { t } = useTranslation();
  const maxScale = source.type === "gamepadStick" && source.stick === "right" ? 100 : 10;

  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Typography.Paragraph className="truncate text-sm font-medium">
          {sourceLabel(source)}
        </Typography.Paragraph>
        <div className="flex shrink-0 gap-1">
          <ToggleButton
            size="sm"
            isSelected={source.invertX}
            onChange={(invertX) => onChange({ ...source, invertX })}
          >
            {t("inputSettings.invertX")}
          </ToggleButton>
          <ToggleButton
            size="sm"
            isSelected={source.invertY}
            onChange={(invertY) => onChange({ ...source, invertY })}
          >
            {t("inputSettings.invertY")}
          </ToggleButton>
        </div>
      </div>
      <NumberSlider
        label={t("inputSettings.scale")}
        max={maxScale}
        min={0}
        step={0.05}
        value={source.scale}
        onChange={(scale) => onChange({ ...source, scale })}
      />
      {source.type === "gamepadStick" && (
        <NumberSlider
          label={t("inputSettings.deadzone")}
          max={0.95}
          min={0}
          step={0.01}
          value={source.deadzone}
          onChange={(deadzone) => onChange({ ...source, deadzone })}
        />
      )}
    </div>
  );
}

function NumberSlider({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="grid grid-cols-[5rem_minmax(0,1fr)_6rem] items-center gap-3 text-sm">
      <span className="text-muted">{label}</span>
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
        </InputGroup>
      </TextField>
    </label>
  );
}

function sourceLabel(source: Vector2InputSource) {
  if (source.type === "mouseMotion") {
    return "Mouse motion";
  }

  if (source.type === "keyboardWasd") {
    return "WASD";
  }

  return source.stick === "left" ? "Gamepad left stick" : "Gamepad right stick";
}
