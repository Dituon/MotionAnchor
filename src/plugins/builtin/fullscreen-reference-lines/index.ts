import { definePlugin, enumSetting, lengthSetting, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import {
  clamp01,
  lengthSetting as lengthSettingValue,
  numberSetting as numberSettingValue,
  stringSetting as stringSettingValue,
} from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.fullscreen-reference-lines",
  name: "Fullscreen Reference Lines",
  kind: "guide",
  enabledByDefault: true,
  order: 20,
  description: "Four center-axis guide lines that extend to the screen edges.",
  settings: {
    color: paintSetting({ label: "Color" }),
    opacity: numberSetting({ defaultValue: 0.4, label: "Opacity", min: 0, max: 1, step: 0.01 }),
    lineWidth: pxSetting({ defaultValue: 16, label: "Line width", min: 1, max: 40, step: 1 }),
    shape: enumSetting({
      defaultValue: "cross",
      label: "Shape",
      options: [
        { label: "Cross", value: "cross" },
        { label: "X", value: "x" },
      ],
    }),
    gap: lengthSetting({
      defaultValue: { value: 256, unit: "px" },
      label: "Center gap",
      px: { min: 0, max: 320, step: 1 },
      percent: { defaultValue: 10, min: 0, max: 100, step: 1 },
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
      const lineWidth = numberSettingValue(settings, "lineWidth", 8);
      const shape = stringSettingValue(settings, "shape", "cross") === "x" ? "x" : "cross";
      const gap = lengthSettingValue(settings, "gap", 84);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.webkitMaskImage = `radial-gradient(circle at center, transparent 0, transparent ${gap}, black ${gap})`;
      canvas.style.maskImage = canvas.style.webkitMaskImage;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = clamp01(numberSettingValue(settings, "opacity", 0.35));
      ctx.strokeStyle = api.paint.canvasStyle(ctx, "color");
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      if (shape === "x") {
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
      } else {
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
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
