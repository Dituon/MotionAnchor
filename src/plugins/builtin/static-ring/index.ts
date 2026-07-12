import { colorSetting, definePlugin, numberSetting, pxSetting } from "../../definePlugin";
import {
  colorSetting as colorSettingValue,
  numberSetting as numberSettingValue,
} from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.static-ring",
  name: "Static Ring",
  kind: "overlay",
  enabledByDefault: false,
  order: 15,
  description: "DOM-rendered static circular overlay.",
  settings: {
    color: colorSetting(),
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
        box-sizing: border-box;
        border: var(--ma-static-ring-stroke) solid var(--ma-static-ring-color);
        border-radius: 50%;
        opacity: var(--ma-static-ring-opacity);
        pointer-events: none;
        transform: translate(-50%, -50%);
      }
    `;

    ring.className = "ma-static-ring";
    root.replaceChildren(style, ring);

    const applySettings = () => {
      const settings = api.settings();
      ring.style.setProperty("--ma-static-ring-color", colorSettingValue(settings, "color"));
      ring.style.setProperty("--ma-static-ring-radius", `${numberSettingValue(settings, "radius", 36)}px`);
      ring.style.setProperty("--ma-static-ring-stroke", `${numberSettingValue(settings, "stroke", 8)}px`);
      ring.style.setProperty("--ma-static-ring-opacity", String(numberSettingValue(settings, "opacity", 1)));
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
