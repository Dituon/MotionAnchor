import { ColorPicker, Label } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { PaintPicker } from "./PaintPicker";
import { PaintSwatch } from "./PaintSwatch";
import type { Paint } from "./types";

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

  return (
    <div className={className}>
      <PaintPicker
        isDisabled={isDisabled}
        solidOnly={solidOnly}
        value={value}
        onChange={onChange}
      >
        {(picker) => (
          <ColorPicker.Trigger className="w-full justify-start gap-3 text-left">
            <PaintSwatch paint={picker.paint} />
            <Label className="min-w-0 flex-1 truncate" isDisabled={isDisabled}>
              {resolvedLabel}
            </Label>
          </ColorPicker.Trigger>
        )}
      </PaintPicker>
    </div>
  );
}
