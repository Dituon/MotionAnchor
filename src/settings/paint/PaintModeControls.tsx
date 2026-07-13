import { Button, ButtonGroup } from "@heroui/react";
import { CircleDot, GitCommitHorizontal, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PaintType } from "./types";
import type { PaintPickerState } from "./usePaintPicker";

type PaintModeControlsProps = {
  picker: PaintPickerState;
  isDisabled?: boolean;
};

const gradientModes: Array<{
  type: Extract<PaintType, "linear-gradient" | "conic-gradient" | "radial-gradient">;
  icon: typeof GitCommitHorizontal;
  labelKey: string;
}> = [
  { type: "linear-gradient", icon: GitCommitHorizontal, labelKey: "linearGradient" },
  { type: "conic-gradient", icon: RotateCw, labelKey: "conicGradient" },
  { type: "radial-gradient", icon: CircleDot, labelKey: "radialGradient" },
];

export function PaintModeControls({ isDisabled = false, picker }: PaintModeControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3">
      <ButtonGroup className="flex rounded-md bg-content2 p-1">
        <Button
          isDisabled={isDisabled}
          size="sm"
          variant={!picker.isGradient ? "primary" : "ghost"}
          onPress={() => picker.setSolid()}
        >
          {t("paint.solid")}
        </Button>
        <Button
          isDisabled={isDisabled}
          size="sm"
          variant={picker.isGradient ? "primary" : "ghost"}
          onPress={picker.setGradient}
        >
          <ButtonGroup.Separator />
          {t("paint.gradient")}
        </Button>
      </ButtonGroup>

      <ButtonGroup className="flex gap-1 rounded-md bg-content2 p-1">
        {gradientModes.map(({ type, icon: Icon, labelKey }, index) => (
          <Button
            key={type}
            isIconOnly
            aria-label={t(`paint.${labelKey}`)}
            isDisabled={isDisabled || !picker.isGradient}
            size="sm"
            variant={picker.gradientType === type ? "primary" : "ghost"}
            onPress={() => picker.setPaintType(type)}
          >
            {index > 0 ? <ButtonGroup.Separator /> : null}
            <Icon aria-hidden="true" />
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}
