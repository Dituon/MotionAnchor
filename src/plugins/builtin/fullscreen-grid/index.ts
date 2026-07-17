import { definePlugin, lengthSetting, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import {
  clamp01,
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
    const style = document.createElement("style");
    const grid = document.createElement("div");
    const verticalLines = document.createElement("div");
    const horizontalLines = document.createElement("div");

    style.textContent = `
      .ma-fullscreen-grid {
        position: absolute;
        inset: 0;
        opacity: var(--ma-grid-opacity);
        pointer-events: none;
        -webkit-mask-image: radial-gradient(
          circle at center,
          transparent 0,
          transparent var(--ma-grid-center-hidden-radius),
          black calc(var(--ma-grid-center-hidden-radius) + var(--ma-grid-center-fade-size))
        );
        mask-image: radial-gradient(
          circle at center,
          transparent 0,
          transparent var(--ma-grid-center-hidden-radius),
          black calc(var(--ma-grid-center-hidden-radius) + var(--ma-grid-center-fade-size))
        );
      }
      .ma-fullscreen-grid__lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
        -webkit-mask-repeat: repeat;
        mask-repeat: repeat;
        -webkit-mask-size: var(--ma-grid-spacing) var(--ma-grid-spacing);
        mask-size: var(--ma-grid-spacing) var(--ma-grid-spacing);
      }
      .ma-fullscreen-grid__lines--vertical {
        -webkit-mask-image: linear-gradient(
          to right,
          black 0,
          black var(--ma-grid-line-width),
          transparent var(--ma-grid-line-width)
        );
        mask-image: linear-gradient(
          to right,
          black 0,
          black var(--ma-grid-line-width),
          transparent var(--ma-grid-line-width)
        );
        -webkit-mask-position: calc(50% - (var(--ma-grid-line-width) / 2)) 0;
        mask-position: calc(50% - (var(--ma-grid-line-width) / 2)) 0;
      }
      .ma-fullscreen-grid__lines--horizontal {
        -webkit-mask-image: linear-gradient(
          to bottom,
          black 0,
          black var(--ma-grid-line-width),
          transparent var(--ma-grid-line-width)
        );
        mask-image: linear-gradient(
          to bottom,
          black 0,
          black var(--ma-grid-line-width),
          transparent var(--ma-grid-line-width)
        );
        -webkit-mask-position: 0 calc(50% - (var(--ma-grid-line-width) / 2));
        mask-position: 0 calc(50% - (var(--ma-grid-line-width) / 2));
      }
    `;

    grid.className = "ma-fullscreen-grid";
    verticalLines.className = "ma-fullscreen-grid__lines ma-fullscreen-grid__lines--vertical";
    horizontalLines.className = "ma-fullscreen-grid__lines ma-fullscreen-grid__lines--horizontal";
    grid.replaceChildren(verticalLines, horizontalLines);
    root.replaceChildren(style, grid);

    const applySettings = () => {
      const settings = api.settings();
      const centerHiddenRadius = lengthSettingValue(settings, "centerHiddenRadius", 0);
      const centerFadeSize =
        "centerFadeSize" in settings
          ? lengthSettingValue(settings, "centerFadeSize", 0)
          : lengthSettingValue(settings, "centerFadeRadius", 0);

      grid.style.setProperty("--ma-grid-opacity", String(clamp01(numberSettingValue(settings, "opacity", 0.16))));
      grid.style.setProperty("--ma-grid-spacing", lengthSettingValue(settings, "spacing", 80));
      grid.style.setProperty("--ma-grid-line-width", `${numberSettingValue(settings, "lineWidth", 1)}px`);
      grid.style.setProperty("--ma-grid-center-hidden-radius", centerHiddenRadius);
      grid.style.setProperty("--ma-grid-center-fade-size", centerFadeSize);
      api.paint.applyBackground(verticalLines, "color");
      api.paint.applyBackground(horizontalLines, "color");
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
