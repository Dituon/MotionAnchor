import { definePlugin, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import { clamp01, numberSetting as numberSettingValue } from "../../runtimeSettings";
import { PluginKind } from "../../types";

export default definePlugin({
  id: "builtin.fullscreen-border",
  name: "Fullscreen Border",
  kind: PluginKind.Layout,
  enabledByDefault: true,
  order: 40,
  description: "DOM-rendered full-screen border with adjustable thickness.",
  settings: {
    color: paintSetting({ label: "Color" }),
    width: pxSetting({ defaultValue: 16, label: "Width", min: 1, max: 120, step: 1 }),
    opacity: numberSetting({ defaultValue: 0.6, label: "Opacity", min: 0, max: 1, step: 0.01 }),
  },
  mount(root, api) {
    const style = document.createElement("style");
    const border = document.createElement("div");
    const edges = ["top", "right", "bottom", "left"].map((side) => {
      const edge = document.createElement("div");

      edge.className = `ma-fullscreen-border__edge ma-fullscreen-border__edge--${side}`;
      return edge;
    });

    style.textContent = `
      .ma-fullscreen-border {
        position: absolute;
        inset: 0;
        opacity: var(--ma-border-opacity);
        pointer-events: none;
      }
      .ma-fullscreen-border__edge {
        position: absolute;
        pointer-events: none;
      }
      .ma-fullscreen-border__edge--top,
      .ma-fullscreen-border__edge--bottom {
        height: var(--ma-border-width);
        left: 0;
        width: 100%;
      }
      .ma-fullscreen-border__edge--left,
      .ma-fullscreen-border__edge--right {
        height: 100%;
        top: 0;
        width: var(--ma-border-width);
      }
      .ma-fullscreen-border__edge--top {
        top: 0;
      }
      .ma-fullscreen-border__edge--right {
        right: 0;
      }
      .ma-fullscreen-border__edge--bottom {
        bottom: 0;
      }
      .ma-fullscreen-border__edge--left {
        left: 0;
      }
    `;

    border.className = "ma-fullscreen-border";
    border.replaceChildren(...edges);
    root.replaceChildren(style, border);

    const applySettings = () => {
      const settings = api.settings();
      const lineWidth = numberSettingValue(settings, "width", 16);

      border.style.setProperty("--ma-border-width", `${lineWidth}px`);
      border.style.setProperty("--ma-border-opacity", String(clamp01(numberSettingValue(settings, "opacity", 1))));
      edges.forEach((edge) => api.paint.applyBackground(edge, "color"));
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
