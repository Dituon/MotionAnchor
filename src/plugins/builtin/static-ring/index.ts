import { definePlugin, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import { clamp01, numberSetting as numberSettingValue } from "../../runtimeSettings";
import { PluginKind } from "../../types";

export default definePlugin({
  id: "builtin.static-ring",
  name: "Static Ring",
  kind: PluginKind.Crosshair,
  enabledByDefault: false,
  order: 15,
  description: "DOM-rendered static circular overlay.",
  settings: {
    color: paintSetting({ label: "Color" }),
    radius: pxSetting({ defaultValue: 36, label: "Radius", min: 4, max: 160, step: 1 }),
    stroke: pxSetting({ defaultValue: 8, label: "Stroke", min: 1, max: 40, step: 1 }),
    opacity: numberSetting({ defaultValue: 0.8, label: "Opacity", min: 0, max: 1, step: 0.01 }),
  },
  mount(root, api) {
    const style = document.createElement("style");
    const ring = document.createElement("div");

    style.textContent = `
      .ma-static-ring {
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(var(--ma-static-ring-radius) * 2);
        height: calc(var(--ma-static-ring-radius) * 2);
        border-radius: 50%;
        opacity: var(--ma-static-ring-opacity);
        pointer-events: none;
        transform: translate(-50%, -50%);
        -webkit-mask-image: radial-gradient(
          circle closest-side,
          transparent calc(100% - var(--ma-static-ring-stroke)),
          black calc(100% - var(--ma-static-ring-stroke))
        );
        mask-image: radial-gradient(
          circle closest-side,
          transparent calc(100% - var(--ma-static-ring-stroke)),
          black calc(100% - var(--ma-static-ring-stroke))
        );
      }
    `;

    ring.className = "ma-static-ring";
    root.replaceChildren(style, ring);

    const applySettings = () => {
      const settings = api.settings();
      const radius = numberSettingValue(settings, "radius", 36);
      const stroke = numberSettingValue(settings, "stroke", 8);
      const opacity = clamp01(numberSettingValue(settings, "opacity", 1));

      ring.style.setProperty("--ma-static-ring-radius", `${radius}px`);
      ring.style.setProperty("--ma-static-ring-stroke", `${stroke}px`);
      ring.style.setProperty("--ma-static-ring-opacity", String(opacity));
      api.paint.applyBackground(ring, "color");
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
