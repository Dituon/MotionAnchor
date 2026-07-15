import { definePlugin, lengthSetting, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import {
  clamp01,
  lengthPixelSetting,
  lengthSetting as lengthSettingValue,
  numberSetting as numberSettingValue,
} from "../../runtimeSettings";
import { PluginKind } from "../../types";

export default definePlugin({
  id: "builtin.fullscreen-grid",
  name: "Fullscreen Grid",
  kind: PluginKind.Layout,
  enabledByDefault: true,
  order: 30,
  description: "A screen-wide grid aligned to the center of the display.",
  settings: {
    color: paintSetting({ label: "Color" }),
    opacity: numberSetting({ defaultValue: 0.2, label: "Opacity", min: 0, max: 1, step: 0.01 }),
    spacing: lengthSetting({
      defaultValue: { value: 160, unit: "px" },
      label: "Spacing",
      px: { min: 16, max: 240, step: 1 },
      percent: { defaultValue: 8, min: 1, max: 100, step: 1 },
    }),
    lineWidth: pxSetting({ defaultValue: 1, label: "Line width", min: 1, max: 12, step: 1 }),
    centerHiddenRadius: lengthSetting({
      defaultValue: { value: 120, unit: "px" },
      label: "Center hidden radius",
      px: { min: 0, max: 640, step: 1 },
      percent: { defaultValue: 10, min: 0, max: 100, step: 1 },
    }),
    centerFadeSize: lengthSetting({
      defaultValue: { value: 20, unit: "%" },
      label: "Center fade edge",
      px: { min: 0, max: 640, step: 1 },
      percent: { defaultValue: 20, min: 0, max: 100, step: 1 },
    }),
  },
  mount(root, api) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    root.replaceChildren(canvas);

    const draw = () => {
      if (!ctx) {
        return;
      }

      const settings = api.settings();
      const rect = root.getBoundingClientRect();
      const width = Math.max(1, rect.width || window.innerWidth);
      const height = Math.max(1, rect.height || window.innerHeight);
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.ceil(width * dpr);
      const pixelHeight = Math.ceil(height * dpr);
      const percentBase = Math.min(width, height);
      const spacing = Math.max(1, lengthPixelSetting(settings, "spacing", 80, percentBase));
      const lineWidth = numberSettingValue(settings, "lineWidth", 1);
      const centerHiddenRadius = lengthSettingValue(settings, "centerHiddenRadius", 0);
      const centerFadeSize =
        "centerFadeSize" in settings
          ? lengthSettingValue(settings, "centerFadeSize", 0)
          : lengthSettingValue(settings, "centerFadeRadius", 0);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.webkitMaskImage = `radial-gradient(circle at center, transparent 0, transparent ${centerHiddenRadius}, black calc(${centerHiddenRadius} + ${centerFadeSize}))`;
      canvas.style.maskImage = canvas.style.webkitMaskImage;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = clamp01(numberSettingValue(settings, "opacity", 0.16));
      ctx.strokeStyle = api.paint.canvasStyle(ctx, "color");
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      for (let x = width / 2; x <= width; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let x = width / 2 - spacing; x >= 0; x -= spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = height / 2; y <= height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      for (let y = height / 2 - spacing; y >= 0; y -= spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }

      ctx.stroke();
      ctx.restore();
    };

    const resize = () => draw();
    window.addEventListener("resize", resize);
    draw();

    return {
      updatePlugin: draw,
      destroy() {
        window.removeEventListener("resize", resize);
        root.replaceChildren();
      },
    };
  },
});
