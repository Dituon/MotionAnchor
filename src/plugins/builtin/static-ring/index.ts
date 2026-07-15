import { definePlugin, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import { clamp01, numberSetting as numberSettingValue } from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.static-ring",
  name: "Static Ring",
  kind: "overlay",
  enabledByDefault: false,
  order: 15,
  description: "Canvas-rendered static circular overlay.",
  settings: {
    color: paintSetting({ label: "Color" }),
    radius: pxSetting({ defaultValue: 36, label: "Radius", min: 4, max: 160, step: 1 }),
    stroke: pxSetting({ defaultValue: 8, label: "Stroke", min: 1, max: 40, step: 1 }),
    opacity: numberSetting({ defaultValue: 0.8, label: "Opacity", min: 0, max: 1, step: 0.01 }),
  },
  mount(root, api) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.style.position = "absolute";
    canvas.style.left = "50%";
    canvas.style.top = "50%";
    canvas.style.transform = "translate(-50%, -50%)";
    canvas.style.pointerEvents = "none";
    root.replaceChildren(canvas);

    const draw = () => {
      if (!ctx) {
        return;
      }

      const settings = api.settings();
      const radius = numberSettingValue(settings, "radius", 36);
      const stroke = numberSettingValue(settings, "stroke", 8);
      const opacity = clamp01(numberSettingValue(settings, "opacity", 1));
      const dpr = window.devicePixelRatio || 1;
      const cssSize = Math.ceil((radius + stroke + 4) * 2);
      const pixelSize = Math.max(1, Math.ceil(cssSize * dpr));

      if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
        canvas.width = pixelSize;
        canvas.height = pixelSize;
      }

      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssSize, cssSize);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = api.paint.canvasStyle(ctx, "color");
      ctx.lineWidth = stroke;
      ctx.beginPath();
      ctx.arc(cssSize / 2, cssSize / 2, radius, 0, Math.PI * 2);
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
