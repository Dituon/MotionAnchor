import type {
  ConicGradientPaint,
  GradientPaint,
  GradientStop,
  HexColor,
  Paint,
  PaintType,
  RadialGradientPaint,
  SolidPaint,
} from "./types";

export const defaultSolidPaint: SolidPaint = {
  type: "solid",
  color: "#4cd964",
};

export const defaultLinearGradientPaint: GradientPaint = {
  type: "linear-gradient",
  angle: 90,
  stops: [
    { color: "#8f8e95", offset: 0 },
    { color: "#653c74", offset: 0.39 },
    { color: "#0000ff", offset: 1 },
  ],
};

export function normalizePaint(value: Paint | undefined): Paint {
  if (!value) {
    return defaultSolidPaint;
  }

  if (value.type === "solid") {
    return {
      type: "solid",
      color: normalizeColorString(value.color) || defaultSolidPaint.color,
    };
  }

  if (value.type === "linear-gradient") {
    return {
      type: "linear-gradient",
      angle: clampNumber(value.angle, 0, 360, 90),
      stops: normalizeGradientStops(value.stops),
    };
  }

  if (value.type === "radial-gradient") {
    return {
      type: "radial-gradient",
      shape: value.shape === "ellipse" ? "ellipse" : "circle",
      position: normalizePosition(value.position),
      stops: normalizeGradientStops(value.stops),
    };
  }

  return {
    type: "conic-gradient",
    angle: clampNumber(value.angle, 0, 360, 0),
    position: normalizePosition(value.position),
    stops: normalizeGradientStops(value.stops),
  };
}

export function normalizePosition(position: { x?: number; y?: number } | undefined): { x: number; y: number } {
  return {
    x: clamp01(position?.x ?? 0.5),
    y: clamp01(position?.y ?? 0.5),
  };
}

function normalizeRadialPaint(value: RadialGradientPaint): RadialGradientPaint {
  return {
    type: "radial-gradient",
    shape: value.shape === "ellipse" ? "ellipse" : "circle",
    position: normalizePosition(value.position),
    stops: normalizeGradientStops(value.stops),
  };
}

export function convertPaintType(paint: Paint, type: PaintType): Paint {
  const normalized = normalizePaint(paint);

  if (normalized.type === type) {
    return normalized;
  }

  if (type === "solid") {
    const selected = getGradientStops(normalized)[0];

    return {
      type: "solid",
      color: selected?.color ?? defaultSolidPaint.color,
    };
  }

  const stops = normalized.type === "solid" ? solidToGradientStops(normalized) : normalized.stops;

  if (type === "linear-gradient") {
    return {
      type,
      angle: normalized.type === "linear-gradient" ? normalized.angle : 90,
      stops,
    };
  }

  if (type === "radial-gradient") {
    return normalizeRadialPaint({
      type,
      shape: normalized.type === "radial-gradient" ? normalized.shape : "circle",
      position: "position" in normalized ? normalized.position : { x: 0.5, y: 0.5 },
      stops,
    });
  }

  return {
    type: "conic-gradient",
    angle: "angle" in normalized ? normalized.angle : 0,
    position: "position" in normalized ? normalized.position : { x: 0.5, y: 0.5 },
    stops,
  };
}

export function getGradientStops(paint: Paint): GradientStop[] {
  return paint.type === "solid" ? solidToGradientStops(paint) : paint.stops;
}

export function getSelectedColor(paint: Paint, selectedStopIndex: number) {
  if (paint.type === "solid") {
    return paint.color;
  }

  return paint.stops[selectedStopIndex]?.color ?? paint.stops[0]?.color ?? defaultSolidPaint.color;
}

export function setSelectedColor(paint: Paint, selectedStopIndex: number, color: string): Paint {
  const nextColor = normalizeColorString(color) || defaultSolidPaint.color;

  if (paint.type === "solid") {
    return { ...paint, color: nextColor };
  }

  return updateStop(paint, selectedStopIndex, { color: nextColor });
}

export function updateStop(paint: GradientPaint, selectedStopIndex: number, patch: Partial<GradientStop>): GradientPaint {
  const stops = paint.stops.map((stop, index) =>
    index === selectedStopIndex
      ? {
          color: normalizeColorString(patch.color ?? stop.color) || stop.color,
          offset: clamp01(patch.offset ?? stop.offset),
        }
      : stop,
  );

  return {
    ...paint,
    stops: normalizeGradientStops(stops),
  };
}

export function addStop(paint: GradientPaint, offset: number, color: string): GradientPaint {
  return {
    ...paint,
    stops: normalizeGradientStops([
      ...paint.stops,
      {
        color: normalizeColorString(color) || defaultSolidPaint.color,
        offset: clamp01(offset),
      },
    ]),
  };
}

export function removeStop(paint: GradientPaint, selectedStopIndex: number): GradientPaint {
  if (paint.stops.length <= 2) {
    return paint;
  }

  return {
    ...paint,
    stops: normalizeGradientStops(paint.stops.filter((_, index) => index !== selectedStopIndex)),
  };
}

export function paintToCss(paint: Paint): string {
  const normalized = normalizePaint(paint);

  if (normalized.type === "solid") {
    return normalized.color;
  }

  const stops = normalized.stops
    .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
    .join(", ");

  if (normalized.type === "linear-gradient") {
    return `linear-gradient(${Math.round(normalized.angle)}deg, ${stops})`;
  }

  if (normalized.type === "radial-gradient") {
    return `radial-gradient(${normalized.shape} at ${formatPosition(normalized.position)}, ${stops})`;
  }

  return `conic-gradient(from ${Math.round(normalized.angle)}deg at ${formatPosition(normalized.position)}, ${stops})`;
}

export function gradientBarCss(paint: Paint): string {
  const stops = getGradientStops(normalizePaint(paint))
    .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
    .join(", ");

  return `linear-gradient(90deg, ${stops})`;
}

export function normalizeHexColor(color: unknown): HexColor | "" {
  const normalized = typeof color === "string" ? color.trim().replace(/^#?/, "#").toLowerCase() : "";

  if (/^#[0-9a-f]{3,4}$/.test(normalized)) {
    const hex = normalized.slice(1);
    const expanded = hex
      .split("")
      .map((part) => part + part)
      .join("");

    return `#${expanded}` as HexColor;
  }

  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(normalized) ? (normalized as HexColor) : "";
}

export function normalizeColorString(color: unknown): HexColor | "" {
  const normalized = typeof color === "string" ? color.trim() : "";

  if (!normalized || /[;{}]/.test(normalized) || /gradient\s*\(/i.test(normalized)) {
    return "";
  }

  return normalizeHexColor(normalized);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(max, Math.max(min, numeric));
}

export function getStopIndex(stops: GradientStop[], target: GradientStop): number {
  return stops.findIndex(
    (stop) => stop.color === target.color && Math.abs(stop.offset - target.offset) < 0.0001,
  );
}

export function isGradientPaint(paint: Paint): paint is GradientPaint {
  return paint.type === "linear-gradient" || paint.type === "radial-gradient" || paint.type === "conic-gradient";
}

export function hasGradientPosition(paint: Paint): paint is RadialGradientPaint | ConicGradientPaint {
  return paint.type === "radial-gradient" || paint.type === "conic-gradient";
}

function normalizeGradientStops(stops: GradientStop[]): GradientStop[] {
  const normalizedStops = stops
    .map((stop) => ({
      color: normalizeColorString(stop.color) || defaultSolidPaint.color,
      offset: clamp01(stop.offset),
    }))
    .sort((left, right) => left.offset - right.offset);

  if (normalizedStops.length >= 2) {
    return normalizedStops;
  }

  return [...defaultLinearGradientPaint.stops];
}

function solidToGradientStops(paint: SolidPaint): GradientStop[] {
  return [
    { color: paint.color, offset: 0 },
    { color: paint.color, offset: 1 },
  ];
}

function formatPosition(position: { x: number; y: number }): string {
  return `${Math.round(position.x * 100)}% ${Math.round(position.y * 100)}%`;
}
