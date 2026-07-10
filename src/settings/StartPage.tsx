import {
  Button,
  Card,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Label,
  Separator,
  Slider,
  Typography,
  parseColor,
} from "@heroui/react";
import { EyeOff, Gauge, Maximize2, Monitor, MousePointer2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";

import { normalizeColor, uniqueColors } from "../overlay/appearance";

type StartPageProps = {
  color: string;
  customColors: string[];
  onColorChange: (color: string) => void;
  onCustomColorsChange: (colors: string[]) => void;
  onOpacityChange: (opacity: number) => void;
  opacity: number;
};

type GameSettingTip = {
  icon: ComponentType<{ "aria-hidden": "true"; className: string }>;
  key: string;
};

const gameSettingTips = [
  { icon: Monitor, key: "displayMode" },
  { icon: EyeOff, key: "motionBlur" },
  { icon: SlidersHorizontal, key: "fov" },
  { icon: Gauge, key: "frameRate" },
  { icon: MousePointer2, key: "mouseInput" },
  { icon: Maximize2, key: "resolutionScale" },
] satisfies GameSettingTip[];

const globalColorPresets = ["#4cd964", "#30c7ff", "#f43f5e", "#f59e0b", "#f4f7fb"];

export function StartPage({
  color,
  customColors,
  onColorChange,
  onCustomColorsChange,
  onOpacityChange,
  opacity,
}: StartPageProps) {
  return (
    <div className="grid gap-3">
      <OverlaySetupCard
        color={color}
        customColors={customColors}
        opacity={opacity}
        onColorChange={onColorChange}
        onCustomColorsChange={onCustomColorsChange}
        onOpacityChange={onOpacityChange}
      />
      <GameSettingsCard />
    </div>
  );
}

function OverlaySetupCard({
  color,
  customColors,
  opacity,
  onColorChange,
  onCustomColorsChange,
  onOpacityChange,
}: StartPageProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("start.title")}</Card.Title>
          <Card.Description>{t("start.description")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-5">
        <GlobalColorSetting
          color={color}
          customColors={customColors}
          onColorChange={onColorChange}
          onCustomColorsChange={onCustomColorsChange}
        />
        <GlobalOpacitySetting opacity={opacity} onOpacityChange={onOpacityChange} />
      </Card.Content>
    </Card>
  );
}

function GlobalColorSetting({
  color,
  customColors,
  onColorChange,
  onCustomColorsChange,
}: Pick<StartPageProps, "color" | "customColors" | "onColorChange" | "onCustomColorsChange">) {
  const { t } = useTranslation();
  const [customColor, setCustomColor] = useState(() => parseOverlayColor(color));
  const selectedColor = normalizeColor(color);
  const selectedCustomColor = customColors.find((custom) => normalizeColor(custom) === selectedColor);
  const colors = uniqueColors([...globalColorPresets, ...customColors]);

  useEffect(() => setCustomColor(parseOverlayColor(color)), [color]);

  const addCustomColor = () => {
    const nextColor = normalizeColor(customColor.toString("hex"));

    if (isPresetColor(nextColor)) {
      onColorChange(nextColor);
      return;
    }

    onCustomColorsChange(uniqueColors([nextColor, ...customColors]));
    onColorChange(nextColor);
  };

  const deleteCustomColor = () => {
    if (!selectedCustomColor) {
      return;
    }

    onCustomColorsChange(customColors.filter((custom) => normalizeColor(custom) !== selectedColor));
    onColorChange(globalColorPresets[0]);
  };

  return (
    <div className="grid gap-2">
      <Label>{t("start.globalColor")}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <ColorSwatchPicker value={color} size="lg" onChange={(nextColor) => onColorChange(nextColor.toString("hex"))}>
          {colors.map((preset) => (
            <ColorSwatchPicker.Item key={preset} color={preset}>
              <ColorSwatchPicker.Swatch />
              <ColorSwatchPicker.Indicator />
            </ColorSwatchPicker.Item>
          ))}
        </ColorSwatchPicker>
        <CustomColorPicker color={customColor} onAdd={addCustomColor} onChange={setCustomColor} />
        <Button
          isIconOnly
          aria-label={t("start.deleteCustomColor")}
          isDisabled={!selectedCustomColor}
          variant="ghost"
          onPress={deleteCustomColor}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function CustomColorPicker({
  color,
  onAdd,
  onChange,
}: {
  color: ReturnType<typeof parseColor>;
  onAdd: () => void;
  onChange: (color: ReturnType<typeof parseColor>) => void;
}) {
  const { t } = useTranslation();

  return (
    <ColorPicker value={color} onChange={onChange}>
      <ColorPicker.Trigger aria-label={t("start.customColor")}>
        <ColorSwatch color={color} size="lg" />
        <Plus aria-hidden="true" />
      </ColorPicker.Trigger>
      <ColorPicker.Popover className="gap-3">
        <ColorArea aria-label={t("start.customColor")} colorSpace="hsb" xChannel="saturation" yChannel="brightness">
          <ColorArea.Thumb />
        </ColorArea>
        <ColorSlider aria-label={t("start.customHue")} colorSpace="hsb" channel="hue">
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
        <Button size="sm" variant="primary" onPress={onAdd}>
          <Plus aria-hidden="true" />
          {t("start.addCustomColor")}
        </Button>
      </ColorPicker.Popover>
    </ColorPicker>
  );
}

function GlobalOpacitySetting({
  opacity,
  onOpacityChange,
}: Pick<StartPageProps, "opacity" | "onOpacityChange">) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{t("start.globalOpacity")}</Label>
        <Typography.Code>{Math.round(opacity * 100)}%</Typography.Code>
      </div>
      <Slider
        aria-label={t("start.globalOpacity")}
        minValue={0}
        maxValue={1}
        step={0.01}
        value={opacity}
        onChange={(value) => {
          if (typeof value === "number") {
            onOpacityChange(value);
          }
        }}
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  );
}

function GameSettingsCard() {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("start.gameSettingsTitle")}</Card.Title>
          <Card.Description>{t("start.gameSettingsDescription")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content>
        {gameSettingTips.map((tip, index) => (
          <GameSettingTipRow key={tip.key} index={index} tip={tip} />
        ))}
      </Card.Content>
    </Card>
  );
}

function GameSettingTipRow({ index, tip }: { index: number; tip: GameSettingTip }) {
  const { t } = useTranslation();
  const Icon = tip.icon;

  return (
    <div>
      {index > 0 && <Separator />}
      <div className="grid gap-3 py-4 sm:grid-cols-[2rem_minmax(0,1fr)]">
        <Icon aria-hidden="true" className="size-5 text-muted" />
        <div className="min-w-0">
          <Typography.Paragraph className="font-medium">{t(`start.tips.${tip.key}.title`)}</Typography.Paragraph>
          <Typography.Paragraph className="text-muted">{t(`start.tips.${tip.key}.description`)}</Typography.Paragraph>
        </div>
      </div>
    </div>
  );
}

function isPresetColor(color: string) {
  return globalColorPresets.some((preset) => normalizeColor(preset) === color);
}

function parseOverlayColor(color: string) {
  return parseColor(normalizeColor(color) || globalColorPresets[0]);
}
