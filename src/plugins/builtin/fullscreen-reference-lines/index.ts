import { definePlugin, enumSetting, lengthSetting, numberSetting, paintSetting } from "../../definePlugin";
import {
  clamp01,
  lengthPixelSetting,
  numberSetting as numberSettingValue,
  stringSetting as stringSettingValue,
} from "../../runtimeSettings";
import { PluginKind } from "../../types";

export default definePlugin({
  id: "builtin.fullscreen-reference-lines",
  name: "Fullscreen Reference Lines",
  kind: PluginKind.Layout,
  enabledByDefault: true,
  order: 20,
  description: "Four center-axis guide lines that extend to the screen edges.",
  settings: {
    color: paintSetting({ label: "Color" }),
    opacity: numberSetting({ defaultValue: 0.4, label: "Opacity", min: 0, max: 1, step: 0.01 }),
    lineWidth: lengthSetting({
      defaultValue: { value: 16, unit: "px" },
      label: "Line width",
      px: { min: 1, max: 640, step: 1 },
      percent: { defaultValue: 1.5, min: 0.1, max: 30, step: 0.1 },
    }),
    shape: enumSetting({
      defaultValue: "cross",
      label: "Shape",
      options: [
        { label: "Cross", value: "cross" },
        { label: "X", value: "x" },
      ],
    }),
    headStyle: enumSetting({
      defaultValue: "none",
      label: "Head style",
      options: [
        { label: "None", value: "none" },
        { label: "Round", value: "round" },
        { label: "Arrow", value: "arrow" },
      ],
    }),
    headLength: lengthSetting({
      defaultValue: { value: 24, unit: "px" },
      label: "Head height",
      px: { min: 4, max: 640, step: 1 },
      percent: { defaultValue: 4, min: 0.1, max: 50, step: 0.1 },
      visibleWhen: { key: "headStyle", equals: "arrow" },
    }),
    gap: lengthSetting({
      defaultValue: { value: 256, unit: "px" },
      label: "Center gap",
      px: { min: 0, max: 640, step: 1 },
      percent: { defaultValue: 10, min: 0, max: 100, step: 1 },
    }),
  },
  mount(root, api) {
    const layer = document.createElement("div");
    const arms = Array.from({ length: 4 }, () => createArmElement());

    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.overflow = "visible";
    layer.replaceChildren(...arms);
    root.replaceChildren(layer);

    const applySettings = () => {
      const settings = api.settings();
      const rect = root.getBoundingClientRect();
      const width = Math.max(1, rect.width || window.innerWidth);
      const height = Math.max(1, rect.height || window.innerHeight);
      const centerX = width / 2;
      const centerY = height / 2;
      const percentBase = Math.min(width, height);
      const lineWidth = Math.max(0.1, lengthPixelSetting(settings, "lineWidth", 16, percentBase));
      const shape = stringSettingValue(settings, "shape", "cross") === "x" ? "x" : "cross";
      const headStyle = stringSettingValue(settings, "headStyle", "none");
      const headLength = Math.max(0, lengthPixelSetting(settings, "headLength", 24, percentBase));
      const armSpecs =
        shape === "x"
          ? [
              {
                outer: { x: 0, y: 0 },
                center: { x: centerX, y: centerY },
                lengthBase: Math.hypot(centerX, centerY),
              },
              {
                outer: { x: width, y: height },
                center: { x: centerX, y: centerY },
                lengthBase: Math.hypot(width - centerX, height - centerY),
              },
              {
                outer: { x: width, y: 0 },
                center: { x: centerX, y: centerY },
                lengthBase: Math.hypot(width - centerX, centerY),
              },
              {
                outer: { x: 0, y: height },
                center: { x: centerX, y: centerY },
                lengthBase: Math.hypot(centerX, height - centerY),
              },
            ]
          : [
              {
                outer: { x: centerX, y: 0 },
                center: { x: centerX, y: centerY },
                lengthBase: centerY,
              },
              {
                outer: { x: centerX, y: height },
                center: { x: centerX, y: centerY },
                lengthBase: height - centerY,
              },
              {
                outer: { x: 0, y: centerY },
                center: { x: centerX, y: centerY },
                lengthBase: centerX,
              },
              {
                outer: { x: width, y: centerY },
                center: { x: centerX, y: centerY },
                lengthBase: width - centerX,
              },
            ];

      layer.style.opacity = String(clamp01(numberSettingValue(settings, "opacity", 0.35)));

      for (const [index, spec] of armSpecs.entries()) {
        updateArmElement(arms[index], {
          center: spec.center,
          gapRadius: Math.max(0, lengthPixelSetting(settings, "gap", 84, spec.lengthBase)),
          headHeight: headLength,
          headStyle,
          lineWidth,
          outer: spec.outer,
          viewport: { width, height },
        });
        api.paint.applyBackground(arms[index], "color");
      }
    };

    const resize = () => applySettings();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);

    resizeObserver?.observe(root);
    window.addEventListener("resize", resize);
    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", resize);
        root.replaceChildren();
      },
    };
  },
});

type Point = {
  x: number;
  y: number;
};

function createArmElement() {
  const root = document.createElement("div");

  root.style.position = "absolute";
  root.style.inset = "0";
  root.style.pointerEvents = "none";

  return root;
}

function updateArmElement(
  arm: HTMLDivElement,
  {
    center,
    gapRadius,
    headHeight,
    headStyle,
    lineWidth,
    outer,
    viewport,
  }: {
    center: Point;
    gapRadius: number;
    headHeight: number;
    headStyle: string;
    lineWidth: number;
    outer: Point;
    viewport: { width: number; height: number };
  },
) {
  const start = outer;
  const dx = center.x - start.x;
  const dy = center.y - start.y;
  const length = Math.hypot(dx, dy);
  const visibleLength = Math.max(0, length - gapRadius);

  if (visibleLength <= 0) {
    arm.style.display = "none";
    return;
  }

  const arrowHeight = headStyle === "arrow" ? Math.min(Math.max(0, headHeight), visibleLength) : 0;

  arm.style.display = "block";
  arm.style.width = `${viewport.width}px`;
  arm.style.height = `${viewport.height}px`;
  arm.style.borderRadius = "0";
  arm.style.transform = "";

  if (headStyle === "arrow") {
    arm.style.clipPath = polygonClipPath(
      arrowArmPoints(start, center, gapRadius, arrowHeight, lineWidth),
    );
    return;
  }

  if (headStyle === "round") {
    arm.style.clipPath = polygonClipPath(roundArmPoints(start, center, gapRadius, lineWidth));
    return;
  }

  arm.style.clipPath = polygonClipPath(rectArmPoints(start, center, gapRadius, lineWidth));
}

function rectArmPoints(start: Point, center: Point, gapRadius: number, lineWidth: number) {
  const geometry = armGeometry(start, center, gapRadius, lineWidth);

  if (!geometry) {
    return [];
  }

  const { end, perpX, perpY, radius, start: visibleStart } = geometry;

  return [
    offsetPoint(visibleStart, perpX, perpY, radius),
    offsetPoint(end, perpX, perpY, radius),
    offsetPoint(end, perpX, perpY, -radius),
    offsetPoint(visibleStart, perpX, perpY, -radius),
  ];
}

function arrowArmPoints(
  start: Point,
  center: Point,
  gapRadius: number,
  headHeight: number,
  lineWidth: number,
) {
  const geometry = armGeometry(start, center, gapRadius, lineWidth);

  if (!geometry) {
    return [];
  }

  const { end, perpX, perpY, radius, start: visibleStart, ux, uy, visibleLength } = geometry;
  const clampedHeadHeight = Math.min(headHeight, visibleLength);
  const base = {
    x: end.x - ux * clampedHeadHeight,
    y: end.y - uy * clampedHeadHeight,
  };

  return [
    offsetPoint(visibleStart, perpX, perpY, radius),
    offsetPoint(base, perpX, perpY, radius),
    end,
    offsetPoint(base, perpX, perpY, -radius),
    offsetPoint(visibleStart, perpX, perpY, -radius),
  ];
}

function roundArmPoints(start: Point, center: Point, gapRadius: number, lineWidth: number) {
  const geometry = armGeometry(start, center, gapRadius, lineWidth);

  if (!geometry) {
    return [];
  }

  const { end, perpX, perpY, radius, start: visibleStart, ux, uy, visibleLength } = geometry;
  const clampedRadius = Math.min(radius, visibleLength / 2);
  const capCenter = {
    x: end.x - ux * clampedRadius,
    y: end.y - uy * clampedRadius,
  };
  const points = [
    offsetPoint(visibleStart, perpX, perpY, radius),
    offsetPoint(capCenter, perpX, perpY, clampedRadius),
  ];

  for (let index = 1; index <= 12; index += 1) {
    const angle = Math.PI / 2 - (Math.PI * index) / 12;

    points.push({
      x: capCenter.x + ux * Math.cos(angle) * clampedRadius + perpX * Math.sin(angle) * clampedRadius,
      y: capCenter.y + uy * Math.cos(angle) * clampedRadius + perpY * Math.sin(angle) * clampedRadius,
    });
  }

  points.push(offsetPoint(visibleStart, perpX, perpY, -radius));

  return points;
}

function armGeometry(start: Point, center: Point, gapRadius: number, lineWidth: number) {
  const dx = center.x - start.x;
  const dy = center.y - start.y;
  const length = Math.hypot(dx, dy);
  const visibleLength = length - gapRadius;

  if (length === 0 || visibleLength <= 0) {
    return null;
  }

  const ux = dx / length;
  const uy = dy / length;

  return {
    end: {
      x: center.x - ux * gapRadius,
      y: center.y - uy * gapRadius,
    },
    perpX: -uy,
    perpY: ux,
    radius: lineWidth / 2,
    start,
    ux,
    uy,
    visibleLength,
  };
}

function offsetPoint(point: Point, x: number, y: number, amount: number) {
  return {
    x: point.x + x * amount,
    y: point.y + y * amount,
  };
}

function polygonClipPath(points: Point[]) {
  return `polygon(${points.map((point) => `${point.x}px ${point.y}px`).join(", ")})`;
}
