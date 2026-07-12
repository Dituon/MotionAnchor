import { colorSetting, definePlugin, lengthSetting, numberSetting, pxSetting } from "../../definePlugin";
import {
  colorSetting as colorSettingValue,
  lengthSetting as lengthSettingValue,
  numberSetting as numberSettingValue,
} from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.fullscreen-grid",
  name: "Fullscreen Grid",
  kind: "guide",
  enabledByDefault: true,
  order: 30,
  description: "A screen-wide grid aligned to the center of the display.",
  settings: {
    color: colorSetting(),
    opacity: numberSetting({ defaultValue: 0.2, label: "Opacity", min: 0, max: 1, step: 0.01 }),
    spacing: lengthSetting({
      defaultValue: { value: 160, unit: "px" },
      label: "Spacing",
      px: { min: 16, max: 240, step: 1 },
      percent: { defaultValue: 8, min: 1, max: 100, step: 1 },
    }),
    lineWidth: pxSetting({ defaultValue: 1, label: "Line width", min: 1, max: 12, step: 1 }),
  },
  mount(root, api) {
    const style = document.createElement("style");
    const grid = document.createElement("div");

    style.textContent = `
      .ma-fullscreen-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: var(--ma-grid-opacity);
        background-image:
          linear-gradient(to right, var(--ma-grid-color) var(--ma-grid-line-width), transparent var(--ma-grid-line-width)),
          linear-gradient(to bottom, var(--ma-grid-color) var(--ma-grid-line-width), transparent var(--ma-grid-line-width));
        background-size: var(--ma-grid-spacing) var(--ma-grid-spacing);
        background-position:
          calc(50% - (var(--ma-grid-line-width) / 2)) 0,
          0 calc(50% - (var(--ma-grid-line-width) / 2));
      }
    `;

    grid.className = "ma-fullscreen-grid";
    root.replaceChildren(style, grid);

    const applySettings = () => {
      const settings = api.settings();
      grid.style.setProperty("--ma-grid-color", colorSettingValue(settings, "color"));
      grid.style.setProperty("--ma-grid-opacity", String(numberSettingValue(settings, "opacity", 0.16)));
      grid.style.setProperty("--ma-grid-spacing", lengthSettingValue(settings, "spacing", 80));
      grid.style.setProperty("--ma-grid-line-width", `${numberSettingValue(settings, "lineWidth", 1)}px`);
    };

    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        root.replaceChildren();
      },
    };
  },
});
