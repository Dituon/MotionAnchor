import { useEffect, useMemo, useState } from "react";

import type { GradientPaint, Paint, PaintType, RadialGradientPaint } from "./types";
import {
  addStop,
  clamp01,
  clampNumber,
  defaultLinearGradientPaint,
  convertPaintType,
  defaultSolidPaint,
  getGradientStops,
  getSelectedColor,
  getStopIndex,
  hasGradientPosition,
  isGradientPaint,
  normalizePaint,
  normalizePosition,
  removeStop,
  setSelectedColor,
  updateStop,
} from "./paintUtils";

export type PaintPickerState = ReturnType<typeof usePaintPicker>;

type UsePaintPickerOptions = {
  value: Paint | undefined;
  onChange: (paint: Paint) => void;
};

export function usePaintPicker({ value, onChange }: UsePaintPickerOptions) {
  const paint = useMemo(() => normalizePaint(value), [value]);
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const stops = getGradientStops(paint);
  const selectedColor = getSelectedColor(paint, selectedStopIndex);
  const selectedStop = isGradientPaint(paint)
    ? (paint.stops[selectedStopIndex] ?? paint.stops[0])
    : undefined;

  useEffect(() => {
    setSelectedStopIndex((current) => Math.min(current, Math.max(0, stops.length - 1)));
  }, [stops.length]);

  const emit = (nextPaint: Paint) => onChange(normalizePaint(nextPaint));

  const setPaintType = (type: PaintType) => {
    emit(convertPaintType(paint, type));
    setSelectedStopIndex(0);
  };

  const setSolid = (color = selectedColor) => emit({ type: "solid", color });
  const setGradient = () =>
    setPaintType(
      paint.type === "radial-gradient" || paint.type === "conic-gradient" ? paint.type : "linear-gradient",
    );
  const setColor = (color: string) => emit(setSelectedColor(paint, selectedStopIndex, color));

  const setAngle = (angle: number) => {
    const nextPaint = convertPaintType(
      paint,
      paint.type === "conic-gradient" ? "conic-gradient" : "linear-gradient",
    );

    if (nextPaint.type !== "linear-gradient" && nextPaint.type !== "conic-gradient") {
      return;
    }

    emit({
      ...nextPaint,
      angle: clampNumber(angle, 0, 360, 90),
    });
  };

  const selectStop = (index: number) => {
    if (isGradientPaint(paint)) {
      setSelectedStopIndex(Math.min(Math.max(0, index), paint.stops.length - 1));
    }
  };

  const setStopOffset = (index: number, offset: number) => {
    if (!isGradientPaint(paint)) {
      return;
    }

    const previousStop = paint.stops[index];
    const nextPaint = updateStop(paint, index, { offset });
    const nextIndex = previousStop
      ? getStopIndex(nextPaint.stops, { ...previousStop, offset: clamp01(offset) })
      : index;

    emit(nextPaint);
    setSelectedStopIndex(nextIndex >= 0 ? nextIndex : index);
  };

  const setSelectedStopOffset = (offset: number) => setStopOffset(selectedStopIndex, offset);

  const addGradientStop = (offset: number) => {
    const gradientPaint = ensureGradientPaint(paint);
    const nextPaint = addStop(gradientPaint, offset, selectedColor || defaultSolidPaint.color);
    const nextIndex = getStopIndex(nextPaint.stops, {
      color: selectedColor || defaultSolidPaint.color,
      offset: clamp01(offset),
    });

    emit(nextPaint);
    setSelectedStopIndex(nextIndex >= 0 ? nextIndex : nextPaint.stops.length - 1);
  };

  const deleteSelectedStop = () => {
    if (!isGradientPaint(paint)) {
      return;
    }

    emit(removeStop(paint, selectedStopIndex));
    setSelectedStopIndex(Math.max(0, selectedStopIndex - 1));
  };

  const setRadialShape = (shape: RadialGradientPaint["shape"]) => {
    const radialPaint = convertPaintType(paint, "radial-gradient");

    if (radialPaint.type !== "radial-gradient") {
      return;
    }

    emit({
      ...radialPaint,
      shape,
    });
  };

  const setGradientPosition = (position: Partial<RadialGradientPaint["position"]>) => {
    if (!hasGradientPosition(paint)) {
      return;
    }

    emit({
      ...paint,
      position: normalizePosition({
        x: position.x ?? paint.position.x,
        y: position.y ?? paint.position.y,
      }),
    });
  };

  return {
    paint,
    stops,
    selectedColor,
    selectedStop,
    selectedStopIndex,
    isGradient: isGradientPaint(paint),
    gradientType: isGradientPaint(paint) ? paint.type : null,
    setPaintType,
    setSolid,
    setGradient,
    setColor,
    setAngle,
    selectStop,
    setStopOffset,
    setSelectedStopOffset,
    addGradientStop,
    deleteSelectedStop,
    setRadialShape,
    setGradientPosition,
  };
}

function ensureGradientPaint(paint: Paint): GradientPaint {
  const gradientPaint = convertPaintType(
    paint,
    paint.type === "radial-gradient" || paint.type === "conic-gradient" ? paint.type : "linear-gradient",
  );

  return gradientPaint.type === "solid" ? defaultLinearGradientPaint : gradientPaint;
}
