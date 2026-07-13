import { ColorArea, ColorPicker, ColorSlider, ColorSwatch, Label, parseColor } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { ColorFields } from "./ColorFields";
import { GradientControls } from "./GradientControls";
import { PaintModeControls } from "./PaintModeControls";
import { convertPaintType, defaultSolidPaint, normalizeColorString, paintToCss } from "./paintUtils";
import type { Paint } from "./types";
import { usePaintPicker } from "./usePaintPicker";

export type PaintInputProps = {
  className?: string;
  isDisabled?: boolean;
  label?: string;
  solidOnly?: boolean;
  value?: Paint;
  onChange: (paint: Paint) => void;
};

export function PaintInput({
  className,
  isDisabled = false,
  label,
  solidOnly = false,
  value,
  onChange,
}: PaintInputProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("paint.label");
  const picker = usePaintPicker({
    value: solidOnly ? convertPaintType(value ?? defaultSolidPaint, "solid") : value,
    onChange: (nextPaint) => onChange(solidOnly ? convertPaintType(nextPaint, "solid") : nextPaint),
  });
  const color = parsePaintColor(picker.selectedColor);
  const paintCss = paintToCss(picker.paint);

  return (
    <div className={className}>
      <ColorPicker
        aria-label={resolvedLabel}
        value={color}
        onChange={(nextColor) => {
          if (!isDisabled) {
            picker.setColor(nextColor.toString("hexa"));
          }
        }}
      >
        <ColorPicker.Trigger className="w-full justify-start gap-3">
          <ColorSwatch
            aria-label={t("paint.selectedColor", { label: resolvedLabel })}
            color={picker.selectedColor}
            size="lg"
          />
          <div className="grid min-w-0 flex-1 gap-1 text-left">
            <Label isDisabled={isDisabled}>{resolvedLabel}</Label>
            <div className="h-2.5 rounded-full ring-1 ring-border" style={{ background: paintCss }} />
          </div>
        </ColorPicker.Trigger>

        <ColorPicker.Popover className="w-[18.375rem] max-w-[calc(100vw-2rem)] gap-3">
          <ColorArea
            aria-label={t("paint.colorArea", { label: resolvedLabel })}
            className="h-[18.375rem] w-full max-w-full rounded-md"
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
          >
            <ColorArea.Thumb />
          </ColorArea>

          {!solidOnly ? <PaintModeControls isDisabled={isDisabled} picker={picker} /> : null}
          {!solidOnly ? <GradientControls isDisabled={isDisabled} picker={picker} /> : null}

          <ColorSlider
            aria-label={t("paint.hue")}
            className="gap-1 px-1"
            colorSpace="hsb"
            channel="hue"
            isDisabled={isDisabled}
          >
            <Label>{t("paint.hue")}</Label>
            <ColorSlider.Output className="text-muted" />
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>

          <ColorSlider
            aria-label={t("paint.alpha")}
            className="gap-1 px-1"
            colorSpace="hsb"
            channel="alpha"
            isDisabled={isDisabled}
          >
            <Label>{t("paint.alpha")}</Label>
            <ColorSlider.Output className="text-muted" />
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>

          <ColorFields isDisabled={isDisabled} />
        </ColorPicker.Popover>
      </ColorPicker>
    </div>
  );
}

function parsePaintColor(color: string) {
  try {
    return parseColor(normalizeColorString(color) || defaultSolidPaint.color);
  } catch {
    return parseColor(defaultSolidPaint.color);
  }
}
