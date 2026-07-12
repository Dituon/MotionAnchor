import { colorSetting, definePlugin, enumSetting, lengthSetting, numberSetting, pxSetting } from "../../definePlugin";
import {
  colorSetting as colorSettingValue,
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
    color: colorSetting(),
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
    const style = document.createElement("style");
    const container = document.createElement("div");

    style.textContent = `
      .ma-reference-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: var(--ma-reference-opacity);
        background-repeat: no-repeat;
        -webkit-mask-image: radial-gradient(
          circle at center,
          transparent 0,
          transparent var(--ma-reference-gap),
          black var(--ma-reference-gap)
        );
        mask-image: radial-gradient(
          circle at center,
          transparent 0,
          transparent var(--ma-reference-gap),
          black var(--ma-reference-gap)
        );
      }
      .ma-reference-lines[data-shape="cross"] {
        background-image:
          linear-gradient(
            to right,
            transparent calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% + (var(--ma-reference-line-width) / 2)),
            transparent calc(50% + (var(--ma-reference-line-width) / 2))
          ),
          linear-gradient(
            to bottom,
            transparent calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% + (var(--ma-reference-line-width) / 2)),
            transparent calc(50% + (var(--ma-reference-line-width) / 2))
          );
      }
      .ma-reference-lines[data-shape="x"] {
        background-image:
          linear-gradient(
            to bottom right,
            transparent calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% + (var(--ma-reference-line-width) / 2)),
            transparent calc(50% + (var(--ma-reference-line-width) / 2))
          ),
          linear-gradient(
            to bottom left,
            transparent calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% - (var(--ma-reference-line-width) / 2)),
            var(--ma-reference-color) calc(50% + (var(--ma-reference-line-width) / 2)),
            transparent calc(50% + (var(--ma-reference-line-width) / 2))
          );
      }
    `;

    container.className = "ma-reference-lines";
    root.replaceChildren(style, container);

    const applySettings = () => {
      const settings = api.settings();
      const shape = stringSettingValue(settings, "shape", "cross") === "x" ? "x" : "cross";

      container.dataset.shape = shape;
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
