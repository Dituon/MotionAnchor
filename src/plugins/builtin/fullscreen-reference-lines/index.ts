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
        left: 50%;
        top: 50%;
        width: var(--ma-reference-line-width);
        height: var(--ma-reference-line-length);
        margin-left: calc(var(--ma-reference-line-width) / -2);
        background: var(--ma-reference-color);
        background: linear-gradient(
          to bottom,
          transparent 0,
          transparent var(--ma-reference-gap),
          var(--ma-reference-color) var(--ma-reference-gap)
        );
        opacity: var(--ma-reference-opacity);
        transform-origin: 50% 0;
        transform: rotate(var(--ma-reference-line-angle));
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
      applyLineGeometry(settings);
    };

    const applyLineGeometry = (settings: Record<string, unknown>) => {
      const rect = container.getBoundingClientRect();
      const halfWidth = (rect.width || window.innerWidth) / 2;
      const halfHeight = (rect.height || window.innerHeight) / 2;
      const shape = stringSettingValue(settings, "shape", "cross") === "x" ? "x" : "cross";
      const targets =
        shape === "x"
          ? [
              { element: top, x: -halfWidth, y: -halfHeight },
              { element: bottom, x: halfWidth, y: halfHeight },
              { element: left, x: -halfWidth, y: halfHeight },
              { element: right, x: halfWidth, y: -halfHeight },
            ]
          : [
              { element: top, x: 0, y: -halfHeight },
              { element: bottom, x: 0, y: halfHeight },
              { element: left, x: -halfWidth, y: 0 },
              { element: right, x: halfWidth, y: 0 },
            ];

      for (const target of targets) {
        const length = Math.hypot(target.x, target.y);
        const angle = Math.atan2(-target.x, target.y) * (180 / Math.PI);

        target.element.style.setProperty("--ma-reference-line-length", `${length}px`);
        target.element.style.setProperty("--ma-reference-line-angle", `${angle}deg`);
      }
    };

    applySettings();
    window.addEventListener("resize", applySettings);

    return {
      updatePlugin: applySettings,
      destroy() {
        window.removeEventListener("resize", applySettings);
        root.replaceChildren();
      },
    };
  },
});
