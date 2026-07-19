import {
  booleanSetting,
  definePlugin,
  lengthSetting,
  numberSetting,
  paintSetting,
} from "../../definePlugin";
import {
  booleanSetting as booleanSettingValue,
  clamp01,
  lengthPixelSetting,
  numberSetting as numberSettingValue,
} from "../../runtimeSettings";
import { PluginKind } from "../../types";
import type { PluginI18nResource } from "../../types";
import type { Paint } from "../../../settings/paint/types";

const armSides = ["top", "right", "bottom", "left"] as const;

type ArmSide = (typeof armSides)[number];

type ArmConfig = {
  colorCss: string;
  gap: number;
  length: number;
  opacity: number;
  width: number;
};

const suffixKeys = ["Independent", "Color", "Opacity", "Width", "Length", "Gap"] as const;
const directionLabels = {
  en: {
    angle: "Angle",
    innerDot: "Inner dot",
    innerDotSize: "Inner dot size",
    outlineColor: "Outline color",
    outlineWidth: "Outline width",
    directions: { top: "Top", right: "Right", bottom: "Bottom", left: "Left" },
    suffixes: {
      Independent: "Independent",
      Color: "Color",
      Gap: "Gap",
      Length: "Length",
      Opacity: "Opacity",
      Width: "Width",
    },
    joiner: " ",
  },
  zh: {
    angle: "角度",
    innerDot: "中心点",
    innerDotSize: "中心点尺寸",
    outlineColor: "描边颜色",
    outlineWidth: "描边宽度",
    directions: { top: "上方", right: "右侧", bottom: "下方", left: "左侧" },
    suffixes: {
      Independent: "独立配置",
      Color: "颜色",
      Gap: "间距",
      Length: "长度",
      Opacity: "透明度",
      Width: "宽度",
    },
    joiner: "",
  },
} as const;

const classicCrosshairI18n: PluginI18nResource = {
  en: {
    pluginSettings: createClassicCrosshairPluginSettings("en"),
    plugins: {
      "builtin.classic-crosshair": {
        description: "Classic FPS crosshair with linked or per-arm configuration.",
        name: "Classic Crosshair",
      },
    },
  },
  zh: {
    pluginSettings: createClassicCrosshairPluginSettings("zh"),
    plugins: {
      "builtin.classic-crosshair": {
        description: "可按边单独配置的经典 FPS 准星。",
        name: "经典准星",
      },
    },
  },
};

function createClassicCrosshairPluginSettings(locale: "en" | "zh") {
  const labels = directionLabels[locale];
  const result: Record<string, unknown> = {
    angle: labels.angle,
    innerDot: labels.innerDot,
    innerDotSize: labels.innerDotSize,
    outlineColor: labels.outlineColor,
    outlineWidth: labels.outlineWidth,
  };

  for (const side of armSides) {
    const sideLabel = labels.directions[side];

    for (const suffix of suffixKeys) {
      result[`${side}${suffix}`] = `${sideLabel}${labels.joiner}${labels.suffixes[suffix]}`;
    }
  }

  return result;
}

export default definePlugin({
  id: "builtin.classic-crosshair",
  name: "Classic Crosshair",
  kind: PluginKind.Crosshair,
  enabledByDefault: false,
  order: 12,
  description: "Classic FPS crosshair with linked or per-arm configuration.",
  i18n: classicCrosshairI18n,
  settings: {
    color: paintSetting({ label: "Color", solidOnly: true }),
    opacity: numberSetting({ defaultValue: 1, label: "Opacity", min: 0, max: 1, step: 0.01 }),
    width: lengthSetting({
      defaultValue: { value: 2, unit: "px" },
      label: "Width",
      px: { min: 1, max: 64, step: 1 },
      percent: { defaultValue: 0.5, min: 0.1, max: 10, step: 0.1 },
    }),
    length: lengthSetting({
      defaultValue: { value: 16, unit: "px" },
      label: "Length",
      px: { min: 1, max: 256, step: 1 },
      percent: { defaultValue: 2, min: 0.1, max: 30, step: 0.1 },
    }),
    gap: lengthSetting({
      defaultValue: { value: 6, unit: "px" },
      label: "Gap",
      px: { min: 0, max: 128, step: 1 },
      percent: { defaultValue: 1, min: 0, max: 20, step: 0.1 },
    }),
    angle: numberSetting({ defaultValue: 0, label: "Angle", min: -180, max: 180, step: 1 }),
    outlineColor: paintSetting({ label: "Outline color", solidOnly: true, defaultValue: "#000" }),
    outlineWidth: lengthSetting({
      defaultValue: { value: 2, unit: "px" },
      label: "Outline width",
      px: { min: 0, max: 36, step: 1 },
      percent: { defaultValue: 0.5, min: 0, max: 10, step: 0.1 },
    }),
    innerDot: booleanSetting({ defaultValue: false, label: "Inner dot" }),
    innerDotSize: lengthSetting({
      defaultValue: { value: 4, unit: "px" },
      label: "Inner dot size",
      px: { min: 1, max: 48, step: 1 },
      percent: { defaultValue: 0.6, min: 0.1, max: 10, step: 0.1 },
    }),
    topIndependent: booleanSetting({
      defaultValue: false,
      label: "Top independent",
    }),
    topColor: paintSetting({
      label: "Top color",
      solidOnly: true,
      visibleWhen: { key: "topIndependent", equals: true },
    }),
    topOpacity: numberSetting({
      defaultValue: 1,
      label: "Top opacity",
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: { key: "topIndependent", equals: true },
    }),
    topWidth: lengthSetting({
      defaultValue: { value: 2, unit: "px" },
      label: "Top width",
      px: { min: 1, max: 64, step: 1 },
      percent: { defaultValue: 0.5, min: 0.1, max: 10, step: 0.1 },
      visibleWhen: { key: "topIndependent", equals: true },
    }),
    topLength: lengthSetting({
      defaultValue: { value: 16, unit: "px" },
      label: "Top length",
      px: { min: 1, max: 256, step: 1 },
      percent: { defaultValue: 2, min: 0.1, max: 30, step: 0.1 },
      visibleWhen: { key: "topIndependent", equals: true },
    }),
    topGap: lengthSetting({
      defaultValue: { value: 6, unit: "px" },
      label: "Top gap",
      px: { min: 0, max: 128, step: 1 },
      percent: { defaultValue: 1, min: 0, max: 20, step: 0.1 },
      visibleWhen: { key: "topIndependent", equals: true },
    }),
    rightIndependent: booleanSetting({
      defaultValue: false,
      label: "Right independent",
    }),
    rightColor: paintSetting({
      label: "Right color",
      solidOnly: true,
      visibleWhen: { key: "rightIndependent", equals: true },
    }),
    rightOpacity: numberSetting({
      defaultValue: 1,
      label: "Right opacity",
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: { key: "rightIndependent", equals: true },
    }),
    rightWidth: lengthSetting({
      defaultValue: { value: 2, unit: "px" },
      label: "Right width",
      px: { min: 1, max: 64, step: 1 },
      percent: { defaultValue: 0.5, min: 0.1, max: 10, step: 0.1 },
      visibleWhen: { key: "rightIndependent", equals: true },
    }),
    rightLength: lengthSetting({
      defaultValue: { value: 16, unit: "px" },
      label: "Right length",
      px: { min: 1, max: 256, step: 1 },
      percent: { defaultValue: 2, min: 0.1, max: 30, step: 0.1 },
      visibleWhen: { key: "rightIndependent", equals: true },
    }),
    rightGap: lengthSetting({
      defaultValue: { value: 6, unit: "px" },
      label: "Right gap",
      px: { min: 0, max: 128, step: 1 },
      percent: { defaultValue: 1, min: 0, max: 20, step: 0.1 },
      visibleWhen: { key: "rightIndependent", equals: true },
    }),
    bottomIndependent: booleanSetting({
      defaultValue: false,
      label: "Bottom independent",
    }),
    bottomColor: paintSetting({
      label: "Bottom color",
      solidOnly: true,
      visibleWhen: { key: "bottomIndependent", equals: true },
    }),
    bottomOpacity: numberSetting({
      defaultValue: 1,
      label: "Bottom opacity",
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: { key: "bottomIndependent", equals: true },
    }),
    bottomWidth: lengthSetting({
      defaultValue: { value: 2, unit: "px" },
      label: "Bottom width",
      px: { min: 1, max: 64, step: 1 },
      percent: { defaultValue: 0.5, min: 0.1, max: 10, step: 0.1 },
      visibleWhen: { key: "bottomIndependent", equals: true },
    }),
    bottomLength: lengthSetting({
      defaultValue: { value: 16, unit: "px" },
      label: "Bottom length",
      px: { min: 1, max: 256, step: 1 },
      percent: { defaultValue: 2, min: 0.1, max: 30, step: 0.1 },
      visibleWhen: { key: "bottomIndependent", equals: true },
    }),
    bottomGap: lengthSetting({
      defaultValue: { value: 6, unit: "px" },
      label: "Bottom gap",
      px: { min: 0, max: 128, step: 1 },
      percent: { defaultValue: 1, min: 0, max: 20, step: 0.1 },
      visibleWhen: { key: "bottomIndependent", equals: true },
    }),
    leftIndependent: booleanSetting({
      defaultValue: false,
      label: "Left independent",
    }),
    leftColor: paintSetting({
      label: "Left color",
      solidOnly: true,
      visibleWhen: { key: "leftIndependent", equals: true },
    }),
    leftOpacity: numberSetting({
      defaultValue: 1,
      label: "Left opacity",
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: { key: "leftIndependent", equals: true },
    }),
    leftWidth: lengthSetting({
      defaultValue: { value: 2, unit: "px" },
      label: "Left width",
      px: { min: 1, max: 64, step: 1 },
      percent: { defaultValue: 0.5, min: 0.1, max: 10, step: 0.1 },
      visibleWhen: { key: "leftIndependent", equals: true },
    }),
    leftLength: lengthSetting({
      defaultValue: { value: 16, unit: "px" },
      label: "Left length",
      px: { min: 1, max: 256, step: 1 },
      percent: { defaultValue: 2, min: 0.1, max: 30, step: 0.1 },
      visibleWhen: { key: "leftIndependent", equals: true },
    }),
    leftGap: lengthSetting({
      defaultValue: { value: 6, unit: "px" },
      label: "Left gap",
      px: { min: 0, max: 128, step: 1 },
      percent: { defaultValue: 1, min: 0, max: 20, step: 0.1 },
      visibleWhen: { key: "leftIndependent", equals: true },
    }),
  },
  mount(root, api) {
    const style = document.createElement("style");
    const stage = document.createElement("div");
    const arms = Object.fromEntries(
      armSides.map((side) => [side, createArmElement(side)]),
    ) as Record<ArmSide, HTMLDivElement>;
    const dot = document.createElement("div");

    style.textContent = `
      .ma-classic-crosshair {
        position: absolute;
        inset: 0;
        overflow: visible;
        pointer-events: none;
      }
      .ma-classic-crosshair__stage {
        position: absolute;
        inset: 0;
        overflow: visible;
        pointer-events: none;
        transform-origin: center center;
      }
      .ma-classic-crosshair__arm {
        position: absolute;
        left: 50%;
        top: 50%;
        box-sizing: border-box;
        pointer-events: none;
      }
      .ma-classic-crosshair__arm--top {
        transform-origin: center bottom;
      }
      .ma-classic-crosshair__arm--right {
        transform-origin: left center;
      }
      .ma-classic-crosshair__arm--bottom {
        transform-origin: center top;
      }
      .ma-classic-crosshair__arm--left {
        transform-origin: right center;
      }
      .ma-classic-crosshair__dot {
        position: absolute;
        left: 50%;
        top: 50%;
        box-sizing: border-box;
        border-radius: 9999px;
        pointer-events: none;
        transform: translate(-50%, -50%);
      }
    `;

    dot.className = "ma-classic-crosshair__dot";
    stage.className = "ma-classic-crosshair__stage";
    stage.replaceChildren(arms.top, arms.right, arms.bottom, arms.left, dot);
    root.className = "ma-classic-crosshair";
    root.replaceChildren(style, stage);

    const applySettings = () => {
      const settings = api.settings();
      const rect = root.getBoundingClientRect();
      const percentBase = Math.max(1, Math.min(rect.width || window.innerWidth || 1, rect.height || window.innerHeight || 1));
      const globalColor = api.paint.setting("color");
      const globalColorCss = api.paint.css("color", { fallback: globalColor });
      const outlineCss = api.paint.css("outlineColor", { fallback: globalColor });
      const outlineWidth = Math.max(0, lengthPixelSetting(settings, "outlineWidth", 2, percentBase));
      const globalOpacity = clamp01(numberSettingValue(settings, "opacity", 1));
      const globalWidth = Math.max(0, lengthPixelSetting(settings, "width", 2, percentBase));
      const globalLength = Math.max(0, lengthPixelSetting(settings, "length", 16, percentBase));
      const globalGap = Math.max(0, lengthPixelSetting(settings, "gap", 6, percentBase));
      const angle = numberSettingValue(settings, "angle", 0);
      const dotVisible = booleanSettingValue(settings, "innerDot", false);
      const dotSize = Math.max(0, lengthPixelSetting(settings, "innerDotSize", 4, percentBase));

      stage.style.transform = `rotate(${angle}deg)`;

      applyDotStyles(dot, {
        color: globalColorCss,
        opacity: globalOpacity,
        outlineCss,
        outlineWidth,
        size: dotSize,
        visible: dotVisible,
      });

      for (const side of armSides) {
        const independent = booleanSettingValue(settings, `${side}Independent`, false);
        const config = independent
          ? readArmConfig(api, settings, percentBase, {
              colorKey: `${side}Color`,
              gapKey: `${side}Gap`,
              lengthKey: `${side}Length`,
              opacityKey: `${side}Opacity`,
              widthKey: `${side}Width`,
              globalColor,
              globalGap,
              globalLength,
              globalOpacity,
              globalWidth,
            })
          : {
              colorCss: globalColorCss,
              gap: globalGap,
              length: globalLength,
              opacity: globalOpacity,
              width: globalWidth,
            };

        applyArmStyles(arms[side], side, config, outlineCss, outlineWidth);
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

function createArmElement(side: ArmSide) {
  const element = document.createElement("div");

  element.className = `ma-classic-crosshair__arm ma-classic-crosshair__arm--${side}`;
  return element;
}

function applyDotStyles(
  dot: HTMLDivElement,
  {
    color,
    opacity,
    outlineCss,
    outlineWidth,
    size,
    visible,
  }: {
    color: string;
    opacity: number;
    outlineCss: string;
    outlineWidth: number;
    size: number;
    visible: boolean;
  },
) {
  if (!visible || size <= 0) {
    dot.style.display = "none";
    return;
  }

  dot.style.display = "block";
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  dot.style.opacity = String(opacity);
  dot.style.background = color;
  dot.style.border = `${outlineWidth}px solid ${outlineCss}`;
}

function applyArmStyles(
  arm: HTMLDivElement,
  side: ArmSide,
  config: ArmConfig,
  outlineCss: string,
  outlineWidth: number,
) {
  const isVertical = side === "top" || side === "bottom";
  const width = isVertical ? config.width : config.length;
  const height = isVertical ? config.length : config.width;

  if (width <= 0 || height <= 0) {
    arm.style.display = "none";
    return;
  }

  arm.style.display = "block";
  arm.style.width = `${width}px`;
  arm.style.height = `${height}px`;
  arm.style.opacity = String(config.opacity);
  arm.style.background = config.colorCss;
  arm.style.boxShadow = outlineWidth > 0 ? `0 0 0 ${outlineWidth}px ${outlineCss}` : "none";
  arm.style.transform = armTransform(side, config.gap);
}

function armTransform(side: ArmSide, gap: number) {
  if (side === "top") {
    return `translate(-50%, calc(-100% - ${gap}px))`;
  }

  if (side === "right") {
    return `translate(${gap}px, -50%)`;
  }

  if (side === "bottom") {
    return `translate(-50%, ${gap}px)`;
  }

  return `translate(calc(-100% - ${gap}px), -50%)`;
}

function readArmConfig(
  api: {
    paint: {
      css: (key: string, options?: { fallback?: Paint }) => string;
      setting: (key: string, fallback?: Paint) => Paint;
    };
  },
  settings: Record<string, unknown>,
  percentBase: number,
  {
    colorKey,
    gapKey,
    lengthKey,
    opacityKey,
    widthKey,
    globalColor,
    globalGap,
    globalLength,
    globalOpacity,
    globalWidth,
  }: {
    colorKey: string;
    gapKey: string;
    lengthKey: string;
    opacityKey: string;
    widthKey: string;
    globalColor: Paint;
    globalGap: number;
    globalLength: number;
    globalOpacity: number;
    globalWidth: number;
  },
): ArmConfig {
  const colorCss = api.paint.css(colorKey, { fallback: globalColor });

  return {
    colorCss,
    gap: Math.max(0, lengthPixelSetting(settings, gapKey, globalGap, percentBase)),
    length: Math.max(0, lengthPixelSetting(settings, lengthKey, globalLength, percentBase)),
    opacity: clamp01(numberSettingValue(settings, opacityKey, globalOpacity)),
    width: Math.max(0, lengthPixelSetting(settings, widthKey, globalWidth, percentBase)),
  };
}
