import { ColorPicker, parseColor } from "@heroui/react";
import type { ReactNode } from "react";

import { PaintPickerContent } from "./PaintPickerContent";
import { convertPaintType, defaultSolidPaint, normalizeColorString } from "./paintUtils";
import type { Paint } from "./types";
import { usePaintPicker, type PaintPickerState } from "./usePaintPicker";

export type PaintPickerProps = {
  children: (picker: PaintPickerState) => ReactNode;
  isDisabled?: boolean;
  solidOnly?: boolean;
  value?: Paint;
  onChange: (paint: Paint) => void;
};

export function PaintPicker({
  children,
  isDisabled = false,
  solidOnly = false,
  value,
  onChange,
}: PaintPickerProps) {
  const picker = usePaintPicker({
    value: solidOnly ? convertPaintType(value ?? defaultSolidPaint, "solid") : value,
    onChange: (nextPaint) => onChange(solidOnly ? convertPaintType(nextPaint, "solid") : nextPaint),
  });

  return (
    <ColorPicker
      value={parsePaintColor(picker.selectedColor)}
      onChange={(nextColor) => {
        if (!isDisabled) {
          picker.setColor(nextColor.toString("hexa"));
        }
      }}
    >
      {children(picker)}
      <ColorPicker.Popover className="w-[18.375rem] max-w-[calc(100vw-2rem)] gap-3">
        <PaintPickerContent isDisabled={isDisabled} picker={picker} solidOnly={solidOnly} />
      </ColorPicker.Popover>
    </ColorPicker>
  );
}

function parsePaintColor(color: string) {
  try {
    return parseColor(normalizeColorString(color) || defaultSolidPaint.color);
  } catch {
    return parseColor(defaultSolidPaint.color);
  }
}
