import { colorSetting, definePlugin, numberSetting, pxSetting } from "../../definePlugin";
import {
  colorSetting as colorSettingValue,
  numberSetting as numberSettingValue,
} from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.fullscreen-border",
  name: "Fullscreen Border",
  kind: "guide",
  enabledByDefault: true,
  order: 40,
  description: "DOM-rendered full-screen border with adjustable thickness.",
  settings: {
    color: colorSetting(),
    width: pxSetting({ defaultValue: 16, label: "Width", min: 1, max: 120, step: 1 }),
    opacity: numberSetting({ defaultValue: 0.6, label: "Opacity", min: 0, max: 1, step: 0.01 }),
  },
  mount(root, api) {
    const style = document.createElement("style");
    const border = document.createElement("div");

    style.textContent = `
      .ma-fullscreen-border {
        position: absolute;
        inset: 0;
        box-sizing: border-box;
        border: var(--ma-border-width) solid var(--ma-border-color);
        opacity: var(--ma-border-opacity);
        pointer-events: none;
      }
    `;

    border.className = "ma-fullscreen-border";
    root.replaceChildren(style, border);

    const applySettings = () => {
      const settings = api.settings();
      border.style.setProperty("--ma-border-color", colorSettingValue(settings, "color"));
      border.style.setProperty("--ma-border-width", `${numberSettingValue(settings, "width", 16)}px`);
      border.style.setProperty("--ma-border-opacity", String(numberSettingValue(settings, "opacity", 1)));
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
