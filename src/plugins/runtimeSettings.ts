import { defaultSolidPaint, normalizeColorString, normalizePaint, paintToCss } from "../settings/paint/paintUtils";
import type { GradientStop, Paint } from "../settings/paint/types";
import { getActiveOverlayPaint, type OverlayAppearance } from "../overlay/appearance";
import type { PaintCoordinateSpace, PaintRect, PluginCanvasPaintOptions, PluginPaintApi } from "./types";

export function numberSetting(settings: Record<string, unknown>, key: string, fallback: number) {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function booleanSetting(settings: Record<string, unknown>, key: string, fallback: boolean) {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

export function lengthSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: number,
  fallbackUnit = "px",
) {
  const value = settings[key];

  if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
    const candidate = value as { value?: unknown; unit?: unknown };

    if (typeof candidate.value === "number" && Number.isFinite(candidate.value) && isLengthUnit(candidate.unit)) {
      return `${candidate.value}${candidate.unit}`;
    }
  }

  return `${fallback}${fallbackUnit}`;
}

export function lengthPixelSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: number,
  percentBase: number,
  fallbackUnit = "px",
) {
  const value = settings[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
    const candidate = value as { value?: unknown; unit?: unknown };

    if (typeof candidate.value === "number" && Number.isFinite(candidate.value) && isLengthUnit(candidate.unit)) {
      return candidate.unit === "%" ? (percentBase * candidate.value) / 100 : candidate.value;
    }
  }

  return fallbackUnit === "%" ? (percentBase * fallback) / 100 : fallback;
}

export function stringSetting(settings: Record<string, unknown>, key: string, fallback: string) {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

export function paintSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback?: Paint,
): Paint {
  return normalizePaint(parsePaintValue(settings[key]) ?? fallback ?? defaultSolidPaint);
}

export function createPluginPaintApi({
  appearance,
  getSettings,
  root,
  viewportElement,
}: {
  appearance: { current: OverlayAppearance };
  getSettings: () => Record<string, unknown>;
  root: HTMLElement;
  viewportElement?: HTMLElement | null;
}): PluginPaintApi {
  const viewport = () => viewportRect(viewportElement ?? root.parentElement ?? root);
  const fallbackPaint = (fallback?: Paint) => fallback ?? getActiveOverlayPaint(appearance.current) ?? defaultSolidPaint;
  const setting = (key: string, fallback?: Paint) => paintSetting(getSettings(), key, fallbackPaint(fallback));

  return {
    applyBackground(element, key, options = {}) {
      const paint = setting(key, options.fallback);

      applyPaintBackground(element, paint, {
        coordinateSpace: options.coordinateSpace ?? "viewport",
        viewportRect: viewport(),
      });
    },
    canvasStyle(ctx, key, options = {}) {
      return paintToCanvasStyle(ctx, setting(key, options.fallback), canvasGradientRect(ctx, options, viewport()));
    },
    css(key, options = {}) {
      return paintToCss(setting(key, options.fallback));
    },
    setting,
    viewportRect: viewport,
  };
}

export function paintToCanvasStyle(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  rect: PaintRect,
): string | CanvasGradient {
  const normalized = normalizePaint(paint);

  if (normalized.type === "solid") {
    return normalized.color;
  }

  if (normalized.type === "linear-gradient") {
    const gradient = createLinearCanvasGradient(ctx, normalized.angle, rect);
    addCanvasStops(gradient, normalized.stops);
    return gradient;
  }

  if (normalized.type === "conic-gradient" && "createConicGradient" in ctx) {
    const centerX = rect.x + rect.width * normalized.position.x;
    const centerY = rect.y + rect.height * normalized.position.y;
    const gradient = ctx.createConicGradient(((normalized.angle - 90) * Math.PI) / 180, centerX, centerY);
    addCanvasStops(gradient, normalized.stops);
    return gradient;
  }

  const centerX = rect.x + rect.width * normalized.position.x;
  const centerY = rect.y + rect.height * normalized.position.y;
  const radius = farthestCornerDistance(rect, centerX, centerY);
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  addCanvasStops(gradient, normalized.stops);
  return gradient;
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function isLengthUnit(value: unknown) {
  return value === "%" || value === "px";
}

function parsePaintValue(value: unknown): Paint | null {
  if (typeof value === "string") {
    const color = normalizeColorString(value);

    return color ? { type: "solid", color } : null;
  }

  if (typeof value === "object" && value !== null && "type" in value) {
    return value as Paint;
  }

  return null;
}

function applyPaintBackground(
  element: HTMLElement,
  paint: Paint,
  {
    coordinateSpace,
    viewportRect,
  }: {
    coordinateSpace: PaintCoordinateSpace;
    viewportRect: PaintRect;
  },
) {
  const normalized = normalizePaint(paint);
  const css = paintToCss(normalized);

  element.style.background = css;

  if (normalized.type === "solid") {
    element.style.backgroundPosition = "";
    element.style.backgroundRepeat = "";
    element.style.backgroundSize = "";
    return;
  }

  if (coordinateSpace === "local") {
    element.style.backgroundPosition = "";
    element.style.backgroundRepeat = "";
    element.style.backgroundSize = "";
    return;
  }

  const elementRect = element.getBoundingClientRect();

  element.style.backgroundPosition = `${viewportRect.x - elementRect.left}px ${viewportRect.y - elementRect.top}px`;
  element.style.backgroundRepeat = "no-repeat";
  element.style.backgroundSize = `${viewportRect.width}px ${viewportRect.height}px`;
}

function addCanvasStops(gradient: CanvasGradient, stops: GradientStop[]) {
  for (const stop of stops) {
    gradient.addColorStop(clamp01(stop.offset), stop.color);
  }
}

function canvasGradientRect(
  ctx: CanvasRenderingContext2D,
  options: PluginCanvasPaintOptions,
  viewport: PaintRect,
): PaintRect {
  if (options.coordinateSpace === "local") {
    return options.rect ?? canvasLocalRect(ctx.canvas);
  }

  const canvasRect = ctx.canvas.getBoundingClientRect();

  return {
    x: viewport.x - canvasRect.left,
    y: viewport.y - canvasRect.top,
    width: viewport.width,
    height: viewport.height,
  };
}

function canvasLocalRect(canvas: HTMLCanvasElement): PaintRect {
  const rect = canvas.getBoundingClientRect();

  return {
    x: 0,
    y: 0,
    width: rect.width || canvas.width || 1,
    height: rect.height || canvas.height || 1,
  };
}

function createLinearCanvasGradient(ctx: CanvasRenderingContext2D, angle: number, rect: PaintRect) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const halfLength = (Math.abs(rect.width * dx) + Math.abs(rect.height * dy)) / 2;

  return ctx.createLinearGradient(
    centerX - dx * halfLength,
    centerY - dy * halfLength,
    centerX + dx * halfLength,
    centerY + dy * halfLength,
  );
}

function viewportRect(element: HTMLElement): PaintRect {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width || window.innerWidth || 1,
    height: rect.height || window.innerHeight || 1,
  };
}

function farthestCornerDistance(rect: PaintRect, x: number, y: number) {
  return Math.max(
    Math.hypot(x - rect.x, y - rect.y),
    Math.hypot(x - (rect.x + rect.width), y - rect.y),
    Math.hypot(x - rect.x, y - (rect.y + rect.height)),
    Math.hypot(x - (rect.x + rect.width), y - (rect.y + rect.height)),
  );
}
