import { ColorPicker } from "@heroui/react";
import { Pencil } from "lucide-react";

import { PaintPicker } from "./PaintPicker";
import type { Paint } from "./types";

export type PaintEditorButtonProps = {
  className?: string;
  isDisabled?: boolean;
  label: string;
  solidOnly?: boolean;
  value?: Paint;
  onChange: (paint: Paint) => void;
};

export function PaintEditorButton({
  className,
  isDisabled = false,
  label,
  solidOnly = false,
  value,
  onChange,
}: PaintEditorButtonProps) {
  const buttonClassName = className ?? "h-10 w-10 min-w-0 shrink-0 rounded-full p-0";

  return (
    <PaintPicker
      isDisabled={isDisabled}
      label={label}
      solidOnly={solidOnly}
      value={value}
      onChange={onChange}
    >
      {() => (
        <ColorPicker.Trigger
          aria-label={label}
          className={`button button--secondary button--sm button--icon-only ${buttonClassName}`}
          isDisabled={isDisabled}
        >
          <Pencil aria-hidden="true" />
        </ColorPicker.Trigger>
      )}
    </PaintPicker>
  );
}
