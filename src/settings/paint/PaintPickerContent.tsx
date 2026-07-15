import { ColorArea, ColorSlider, Label } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { ColorFields } from "./ColorFields";
import { GradientControls } from "./GradientControls";
import { PaintModeControls } from "./PaintModeControls";
import type { PaintPickerState } from "./usePaintPicker";

type PaintPickerContentProps = {
  isDisabled: boolean;
  label: string;
  picker: PaintPickerState;
  solidOnly: boolean;
};

export function PaintPickerContent({ isDisabled, label, picker, solidOnly }: PaintPickerContentProps) {
  const { t } = useTranslation();

  return (
    <>
      <ColorArea
        aria-label={t("paint.colorArea", { label })}
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
    </>
  );
}
