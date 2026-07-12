import { colorSetting, definePlugin, lengthSetting, numberSetting, pxSetting } from "../../definePlugin";
import {
  colorSetting as colorSettingValue,
  lengthSetting as lengthSettingValue,
  numberSetting as numberSettingValue,
} from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.fullscreen-reference-lines",
  name: "Fullscreen Reference Lines",
  kind: "guide",
  enabledByDefault: true,
  order: 20,
  description: "Four center-axis guide lines that extend to the screen edges.",
  settings: {
    color: colorSetting(),
    opacity: numberSetting({ defaultValue: 0.4, label: "Opacity", min: 0, max: 1, step: 0.01 }),
    lineWidth: pxSetting({ defaultValue: 16, label: "Line width", min: 1, max: 40, step: 1 }),
    gap: lengthSetting({
      defaultValue: { value: 256, unit: "px" },
      label: "Center gap",
      px: { min: 0, max: 320, step: 1 },
      percent: { defaultValue: 10, min: 0, max: 100, step: 1 },
    }),
  },
  mount(root, api) {
    const style = document.createElement("style");
    const container = document.createElement("div");
    const top = document.createElement("div");
    const bottom = document.createElement("div");
    const left = document.createElement("div");
    const right = document.createElement("div");

    style.textContent = `
      .ma-reference-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .ma-reference-lines__line {
        position: absolute;
        background: var(--ma-reference-color);
        opacity: var(--ma-reference-opacity);
      }
      .ma-reference-lines__line--vertical {
        left: 50%;
        width: var(--ma-reference-line-width);
        transform: translateX(-50%);
      }
      .ma-reference-lines__line--horizontal {
        top: 50%;
        height: var(--ma-reference-line-width);
        transform: translateY(-50%);
      }
      .ma-reference-lines__line--top {
        top: 0;
        bottom: calc(50% + var(--ma-reference-gap));
      }
      .ma-reference-lines__line--bottom {
        top: calc(50% + var(--ma-reference-gap));
        bottom: 0;
      }
      .ma-reference-lines__line--left {
        left: 0;
        right: calc(50% + var(--ma-reference-gap));
      }
      .ma-reference-lines__line--right {
        left: calc(50% + var(--ma-reference-gap));
        right: 0;
      }
    `;

    container.className = "ma-reference-lines";
    top.className = "ma-reference-lines__line ma-reference-lines__line--vertical ma-reference-lines__line--top";
    bottom.className = "ma-reference-lines__line ma-reference-lines__line--vertical ma-reference-lines__line--bottom";
    left.className = "ma-reference-lines__line ma-reference-lines__line--horizontal ma-reference-lines__line--left";
    right.className = "ma-reference-lines__line ma-reference-lines__line--horizontal ma-reference-lines__line--right";
    container.append(top, bottom, left, right);
    root.replaceChildren(style, container);

    const applySettings = () => {
      const settings = api.settings();
      container.style.setProperty("--ma-reference-color", colorSettingValue(settings, "color"));
      container.style.setProperty("--ma-reference-opacity", String(numberSettingValue(settings, "opacity", 0.35)));
      container.style.setProperty("--ma-reference-line-width", `${numberSettingValue(settings, "lineWidth", 8)}px`);
      container.style.setProperty("--ma-reference-gap", lengthSettingValue(settings, "gap", 84));
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
