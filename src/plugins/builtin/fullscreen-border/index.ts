import { definePlugin, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import { clamp01, numberSetting as numberSettingValue } from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.fullscreen-border",
  name: "Fullscreen Border",
  kind: "guide",
  enabledByDefault: true,
  order: 40,
  description: "Canvas-rendered full-screen border with adjustable thickness.",
  settings: {
    color: paintSetting({ label: "Color" }),
    width: pxSetting({ defaultValue: 16, label: "Width", min: 1, max: 120, step: 1 }),
    opacity: numberSetting({ defaultValue: 0.6, label: "Opacity", min: 0, max: 1, step: 0.01 }),
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
      const lineWidth = numberSettingValue(settings, "width", 16);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = clamp01(numberSettingValue(settings, "opacity", 1));
      ctx.strokeStyle = api.paint.canvasStyle(ctx, "color");
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(lineWidth / 2, lineWidth / 2, Math.max(0, width - lineWidth), Math.max(0, height - lineWidth));
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
