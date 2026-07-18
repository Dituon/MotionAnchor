import { Button, ButtonGroup, InputGroup, TextField } from "@heroui/react";
import { MapPin, Trash2, TriangleRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { GradientBar } from "./GradientBar";
import { clampPercent, hasGradientPosition } from "./paintUtils";
import type { RadialGradientPaint } from "./types";
import type { PaintPickerState } from "./usePaintPicker";

type GradientControlsProps = {
  isDisabled?: boolean;
  picker: PaintPickerState;
};

const radialShapes: RadialGradientPaint["shape"][] = ["circle", "ellipse"];

export function GradientControls({ isDisabled = false, picker }: GradientControlsProps) {
  if (!picker.isGradient) {
    return null;
  }

  const anglePaint =
    picker.paint.type === "linear-gradient" || picker.paint.type === "conic-gradient" ? picker.paint : null;
  const positionPaint = hasGradientPosition(picker.paint) ? picker.paint : null;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        {anglePaint ? (
          <NumberControl
            icon={<TriangleRight className="size-4 text-muted" />}
            isDisabled={isDisabled}
            max={360}
            suffix="deg"
            value={Math.round(anglePaint.angle)}
            onChange={picker.setAngle}
          />
        ) : (
          <RadialShapeControl isDisabled={isDisabled} picker={picker} />
        )}

        <NumberControl
          icon={<MapPin className="size-4 text-muted" />}
          isDisabled={isDisabled}
          max={100}
          suffix="%"
          value={Math.round((picker.selectedStop?.offset ?? 0) * 100)}
          onChange={(value) => picker.setSelectedStopOffset(clampPercent(value) / 100)}
        />

        <Button
          isIconOnly
          isDisabled={isDisabled || picker.stops.length <= 2}
          size="sm"
          variant="ghost"
          onPress={picker.deleteSelectedStop}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <GradientBar
        activeIndex={picker.selectedStopIndex}
        isDisabled={isDisabled}
        paint={picker.paint}
        stops={picker.stops}
        onAddStop={picker.addGradientStop}
        onSelectStop={picker.selectStop}
        onStopOffsetChange={picker.setStopOffset}
      />

      {positionPaint ? (
        <div className="grid grid-cols-2 gap-2">
          {(["x", "y"] as const).map((axis) => (
            <NumberControl
              key={axis}
              isDisabled={isDisabled}
              max={100}
              prefix={axis.toUpperCase()}
              suffix="%"
              value={Math.round(positionPaint.position[axis] * 100)}
              onChange={(value) => picker.setGradientPosition({ [axis]: clampPercent(value) / 100 })}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RadialShapeControl({ isDisabled, picker }: { isDisabled: boolean; picker: PaintPickerState }) {
  const { t } = useTranslation();
  const shape = picker.paint.type === "radial-gradient" ? picker.paint.shape : "circle";

  return (
    <ButtonGroup variant="tertiary" className="flex rounded-sm bg-content2">
      {radialShapes.map((nextShape, index) => (
        <Button
          key={nextShape}
          isDisabled={isDisabled}
          size="sm"
          variant={shape === nextShape ? "primary" : "ghost"}
          onPress={() => picker.setRadialShape(nextShape)}
        >
          {index > 0 ? <ButtonGroup.Separator /> : null}
          {t(`paint.shapes.${nextShape}`)}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function NumberControl({
  icon,
  isDisabled,
  max,
  prefix,
  suffix,
  value,
  onChange,
}: {
  icon?: ReactNode;
  isDisabled: boolean;
  max: number;
  prefix?: ReactNode;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextField>
      <InputGroup fullWidth variant="secondary">
        <InputGroup.Prefix>{icon ?? prefix}</InputGroup.Prefix>
        <InputGroup.Input
          className="w-full remove-spin"
          disabled={isDisabled}
          max={max}
          min={0}
          type="number"
          value={String(value)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <InputGroup.Suffix>{suffix}</InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}
