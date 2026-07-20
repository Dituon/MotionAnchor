import "number-flow";
import "number-flow/group";

import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";

import {
  booleanSetting,
  definePlugin,
  enumSetting,
  positionSetting,
  stringSetting,
  lengthSetting,
  numberSetting,
  paintSetting,
} from "../../definePlugin";
import {
  booleanSetting as booleanSettingValue,
  clamp01,
  lengthSetting as lengthSettingValue,
  numberSetting as numberSettingValue,
  stringSetting as stringSettingValue,
} from "../../runtimeSettings";
import { PluginKind } from "../../types";
import type { LengthValue, PluginI18nResource, PluginSettingDefinition, PositionValue } from "../../types";

const sections = ["primary", "secondary"] as const;
const sectionLabels = {
  en: { primary: "Primary", secondary: "Secondary" },
  zh: { primary: "主文本", secondary: "副文本" },
} as const;
const suffixLabels = {
  en: {
    Animate: "Animate",
    Color: "Color",
    CustomFormat: "Custom format",
    DateFormat: "Date format",
    FontSize: "Font size",
    FontWeight: "Font weight",
    Opacity: "Opacity",
    TimeFormat: "Time format",
    Type: "Type",
    Visible: "Visible",
  },
  zh: {
    Animate: "动画",
    Color: "颜色",
    CustomFormat: "自定义格式",
    DateFormat: "日期格式",
    FontSize: "字号",
    FontWeight: "字重",
    Opacity: "透明度",
    TimeFormat: "时间格式",
    Type: "类型",
    Visible: "显示",
  },
} as const;

type SectionName = (typeof sections)[number];
type SectionType = "custom" | "date" | "time";
type SectionConfig = {
  colorCss: string;
  customFormat: string;
  dateFormat: string;
  animate: boolean;
  fontSize: string;
  fontWeight: number;
  opacity: number;
  timeFormat: string;
  type: SectionType;
  visible: boolean;
};

type FlowToken =
  | {
      kind: "number";
      digits: number;
      prefix: string;
      suffix: string;
      value: number;
    }
  | {
      kind: "text";
      text: string;
    };

type FlowNodeState = {
  kind: FlowToken["kind"];
  node: Node;
  digits?: number;
  prefix?: string;
  suffix?: string;
  text?: string;
  value?: number;
};

type SectionRenderState = {
  container: HTMLDivElement;
  content: HTMLElement;
  nodes: FlowNodeState[];
};

const defaultPosition: PositionValue = {
  x: { value: 50, unit: "%" },
  y: { value: 8, unit: "%" },
};

const digitalClockI18n: PluginI18nResource = {
  en: {
    pluginSettings: createDigitalClockPluginSettings("en"),
    plugins: {
      "builtin.digital-clock": {
        description: "Digital clock with configurable date and time sections.",
        name: "Digital Clock",
      },
    },
  },
  zh: {
    pluginSettings: createDigitalClockPluginSettings("zh"),
    plugins: {
      "builtin.digital-clock": {
        description: "在屏幕上显示可配置日期和时间的数字时钟。",
        name: "数字时钟",
      },
    },
  },
};

function createDigitalClockPluginSettings(locale: "en" | "zh") {
  const section = sectionLabels[locale];
  const suffix = suffixLabels[locale];
  const joiner = locale === "en" ? " " : "";
  const result: Record<string, unknown> = {
    align: locale === "en" ? "Align" : "对齐",
    fontFamily: locale === "en" ? "Font family" : "字体",
    groups: section,
    options: {
      align: {
        center: locale === "en" ? "Center" : "居中",
        left: locale === "en" ? "Left" : "左对齐",
        right: locale === "en" ? "Right" : "右对齐",
      },
      primaryDateFormat: dateFormatOptionLabels(),
      primaryTimeFormat: timeFormatOptionLabels(),
      primaryType: typeOptionLabels(locale),
      secondaryDateFormat: dateFormatOptionLabels(),
      secondaryTimeFormat: timeFormatOptionLabels(),
      secondaryType: typeOptionLabels(locale),
    },
    position: locale === "en" ? "Position" : "位置",
  };

  for (const name of sections) {
    const label = section[name];

    for (const key of Object.keys(suffix) as Array<keyof (typeof suffixLabels)["en"]>) {
      result[`${name}${key}`] = `${label}${joiner}${suffix[key]}`;
    }
  }

  return result;
}

function typeOptionLabels(locale: "en" | "zh") {
  return locale === "en"
    ? { custom: "Custom", date: "Date", time: "Time" }
    : { custom: "自定义", date: "日期", time: "时间" };
}

function timeFormatOptionLabels() {
  return {
    "HH:mm": "HH:mm",
    "HH:mm:ss": "HH:mm:ss",
    "hh:mm a": "hh:mm a",
    "hh:mm:ss a": "hh:mm:ss a",
  };
}

function dateFormatOptionLabels() {
  return {
    "dd/MM/yyyy": "dd/MM/yyyy",
    "EEE, MMM d": "EEE, MMM d",
    "MM/dd/yyyy": "MM/dd/yyyy",
    "yyyy-MM-dd": "yyyy-MM-dd",
    "yyyy-MM-dd EEE": "yyyy-MM-dd EEE",
  };
}

export default definePlugin({
  id: "builtin.digital-clock",
  name: "Digital Clock",
  kind: PluginKind.Component,
  enabledByDefault: false,
  order: 20,
  description: "DOM-rendered digital clock with configurable date and time sections.",
  i18n: digitalClockI18n,
  settings: {
    position: positionSetting(defaultPosition),
    align: enumSetting({
      defaultValue: "center",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    }),
    fontFamily: stringSetting({
      defaultValue: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      label: "Font family",
    }),
    ...sectionSettings("primary", {
      customFormat: "HH:mm",
      dateFormat: "yyyy-MM-dd",
      animate: false,
      fontSize: { value: 44, unit: "px" },
      fontWeight: 700,
      opacity: 1,
      timeFormat: "HH:mm",
      type: "time",
      visible: true,
    }),
    ...sectionSettings("secondary", {
      customFormat: "yyyy-MM-dd",
      dateFormat: "yyyy-MM-dd",
      animate: false,
      fontSize: { value: 16, unit: "px" },
      fontWeight: 500,
      opacity: 0.72,
      timeFormat: "HH:mm",
      type: "date",
      visible: true,
    }),
  },
  mount(root, api) {
    const style = document.createElement("style");
    const clock = document.createElement("div");
    const sectionStates = Object.fromEntries(
      sections.map((section) => [section, createSectionState()]),
    ) as Record<SectionName, SectionRenderState>;
    let timer = 0;

    style.textContent = `
      .ma-digital-clock {
        position: absolute;
        left: var(--ma-clock-x);
        top: var(--ma-clock-y);
        display: flex;
        flex-direction: column;
        align-items: var(--ma-clock-align);
        gap: 0.16em;
        font-family: var(--ma-clock-font-family);
        line-height: 1;
        pointer-events: none;
        transform: translate(-50%, -50%);
        white-space: nowrap;
      }
      .ma-digital-clock__section {
        display: flex;
        align-items: baseline;
        color: var(--ma-clock-section-color);
        font-size: var(--ma-clock-section-size);
        font-weight: var(--ma-clock-section-weight);
        opacity: var(--ma-clock-section-opacity);
      }
      .ma-digital-clock__content {
        display: inline-flex;
        align-items: baseline;
        white-space: pre;
        font-variant-numeric: tabular-nums;
      }
      .ma-digital-clock__text {
        white-space: pre;
      }
      .ma-digital-clock__flow {
        display: inline-flex;
        align-items: baseline;
        white-space: pre;
      }
    `;

    clock.className = "ma-digital-clock";
    clock.replaceChildren(sectionStates.primary.container, sectionStates.secondary.container);
    root.replaceChildren(style, clock);

    const applySettings = () => {
      const settings = api.settings();
      const position = readPositionSetting(settings.position);
      const align = readAlign(settings);
      const fontFamily = stringSettingValue(
        settings,
        "fontFamily",
        "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      );
      const now = new Date();

      clock.style.setProperty("--ma-clock-x", lengthToCss(position.x));
      clock.style.setProperty("--ma-clock-y", lengthToCss(position.y));
      clock.style.setProperty("--ma-clock-align", align);
      clock.style.setProperty("--ma-clock-font-family", fontFamily);

      for (const section of sections) {
        renderSection(sectionStates[section], readSectionConfig(section, settings, api), now);
      }
    };

    const startTimer = () => {
      window.clearInterval(timer);
      timer = window.setInterval(applySettings, 1000);
    };

    startTimer();
    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        window.clearInterval(timer);
        root.replaceChildren();
      },
    };
  },
});

function sectionSettings(
  section: SectionName,
  defaults: {
    customFormat: string;
    dateFormat: string;
    animate: boolean;
    fontSize: LengthValue;
    fontWeight: number;
    opacity: number;
    timeFormat: string;
    type: SectionType;
    visible: boolean;
  },
): Record<string, PluginSettingDefinition> {
  const group = section;
  const capitalized = capitalize(section);

  return {
    [`${section}Visible`]: booleanSetting({ defaultValue: defaults.visible, group, label: `${capitalized} visible` }),
    [`${section}Animate`]: booleanSetting({
      defaultValue: defaults.animate,
      group,
      label: `${capitalized} animate`,
    }),
    [`${section}Type`]: enumSetting({
      defaultValue: defaults.type,
      group,
      label: `${capitalized} type`,
      options: [
        { label: "Time", value: "time" },
        { label: "Date", value: "date" },
        { label: "Custom", value: "custom" },
      ],
    }),
    [`${section}TimeFormat`]: enumSetting({
      defaultValue: defaults.timeFormat,
      group,
      label: `${capitalized} time format`,
      options: [
        { label: "HH:mm", value: "HH:mm" },
        { label: "HH:mm:ss", value: "HH:mm:ss" },
        { label: "hh:mm a", value: "hh:mm a" },
        { label: "hh:mm:ss a", value: "hh:mm:ss a" },
      ],
      visibleWhen: { key: `${section}Type`, equals: "time" },
    }),
    [`${section}DateFormat`]: enumSetting({
      defaultValue: defaults.dateFormat,
      group,
      label: `${capitalized} date format`,
      options: [
        { label: "yyyy-MM-dd", value: "yyyy-MM-dd" },
        { label: "MM/dd/yyyy", value: "MM/dd/yyyy" },
        { label: "dd/MM/yyyy", value: "dd/MM/yyyy" },
        { label: "EEE, MMM d", value: "EEE, MMM d" },
        { label: "yyyy-MM-dd EEE", value: "yyyy-MM-dd EEE" },
      ],
      visibleWhen: { key: `${section}Type`, equals: "date" },
    }),
    [`${section}CustomFormat`]: stringSetting({
      defaultValue: defaults.customFormat,
      group,
      label: `${capitalized} custom format`,
      visibleWhen: { key: `${section}Type`, equals: "custom" },
    }),
    [`${section}FontSize`]: lengthSetting({
      defaultValue: defaults.fontSize,
      group,
      label: `${capitalized} font size`,
      percent: { defaultValue: 4, min: 0.1, max: 20, step: 0.1 },
      px: { min: 1, max: 160, step: 1 },
    }),
    [`${section}FontWeight`]: numberSetting({
      defaultValue: defaults.fontWeight,
      group,
      label: `${capitalized} font weight`,
      min: 100,
      max: 900,
      step: 100,
    }),
    [`${section}Color`]: paintSetting({ group, label: `${capitalized} color`, solidOnly: true }),
    [`${section}Opacity`]: numberSetting({
      defaultValue: defaults.opacity,
      group,
      label: `${capitalized} opacity`,
      min: 0,
      max: 1,
      step: 0.01,
    }),
  };
}

function renderSection(state: SectionRenderState, config: SectionConfig, now: Date) {
  const { container, content } = state;

  if (!config.visible) {
    container.style.display = "none";
    content.textContent = "";
    state.nodes = [];
    return;
  }

  container.style.display = "flex";
  container.style.setProperty("--ma-clock-section-color", config.colorCss);
  container.style.setProperty("--ma-clock-section-opacity", String(config.opacity));
  container.style.setProperty("--ma-clock-section-size", config.fontSize);
  container.style.setProperty("--ma-clock-section-weight", String(config.fontWeight));

  const text = formatDate(now, selectedFormat(config), fallbackFormat(config.type));

  if (!config.animate) {
    syncPlainText(state, text);
    return;
  }

  const tokens = tokenizeNumberFlow(text);

  if (tokens.length === 0) {
    syncPlainText(state, text);
    return;
  }

  syncNumberFlow(state, tokens);
}

function readSectionConfig(
  section: SectionName,
  settings: Record<string, unknown>,
  api: { paint: { css: (key: string) => string } },
): SectionConfig {
  const prefix = section;
  const type = readSectionType(settings, `${prefix}Type`);

  return {
    colorCss: api.paint.css(`${prefix}Color`),
    customFormat: stringSettingValue(settings, `${prefix}CustomFormat`, "HH:mm"),
    dateFormat: stringSettingValue(settings, `${prefix}DateFormat`, "yyyy-MM-dd"),
    animate: booleanSettingValue(settings, `${prefix}Animate`, false),
    fontSize: lengthSettingValue(settings, `${prefix}FontSize`, section === "primary" ? 44 : 16),
    fontWeight: numberSettingValue(settings, `${prefix}FontWeight`, section === "primary" ? 700 : 500),
    opacity: clamp01(numberSettingValue(settings, `${prefix}Opacity`, section === "primary" ? 1 : 0.72)),
    timeFormat: stringSettingValue(settings, `${prefix}TimeFormat`, "HH:mm"),
    type,
    visible: booleanSettingValue(settings, `${prefix}Visible`, true),
  };
}

function selectedFormat(config: SectionConfig) {
  if (config.type === "custom") {
    return config.customFormat;
  }

  return config.type === "date" ? config.dateFormat : config.timeFormat;
}

function formatDate(now: Date, formatPattern: string, fallbackPattern: string) {
  const locale = currentLocale();

  try {
    return format(now, formatPattern || fallbackPattern, { locale });
  } catch {
    try {
      return format(now, fallbackPattern, { locale });
    } catch {
      return "";
    }
  }
}

function fallbackFormat(type: SectionType) {
  return type === "date" ? "yyyy-MM-dd" : "HH:mm";
}

function createSectionState(): SectionRenderState {
  const container = document.createElement("div");
  const content = document.createElement("number-flow-group");

  container.className = "ma-digital-clock__section";
  content.className = "ma-digital-clock__content";
  container.replaceChildren(content);

  return {
    container,
    content,
    nodes: [],
  };
}

function syncPlainText(state: SectionRenderState, text: string) {
  const { content } = state;
  const current = content.textContent ?? "";

  if (current === text && content.childNodes.length === 1 && content.firstChild?.nodeType === Node.TEXT_NODE) {
    return;
  }

  content.replaceChildren(document.createTextNode(text));
  state.nodes = [{ kind: "text", node: content.firstChild!, text }];
}

function syncNumberFlow(state: SectionRenderState, tokens: FlowToken[]) {
  const { content } = state;
  const currentNodes = state.nodes;
  const sameShape =
    currentNodes.length === tokens.length &&
    currentNodes.every((node, index) => isSameTokenShape(node, tokens[index] as FlowToken));

  if (!sameShape) {
    content.replaceChildren(...tokens.map(createTokenNode));
    state.nodes = Array.from(content.childNodes).map((node, index) => snapshotTokenNode(node, tokens[index] as FlowToken));
    return;
  }

  state.nodes = currentNodes.map((node, index) => {
    const token = tokens[index] as FlowToken;

    if (token.kind === "text" && node.node.nodeType === Node.TEXT_NODE) {
      if (node.text !== token.text) {
        node.node.textContent = token.text;
        node.text = token.text;
      }

      return node;
    }

    if (token.kind === "number" && node.node instanceof HTMLElement) {
      const flow = node.node as NumberFlowElement;
      updateNumberFlow(flow, token);

      return {
        kind: "number",
        node: flow,
        digits: token.digits,
        prefix: token.prefix,
        suffix: token.suffix,
        value: token.value,
      };
    }

    return node;
  });
}

function isSameTokenShape(node: FlowNodeState, token: FlowToken) {
  if (node.kind !== token.kind) {
    return false;
  }

  if (token.kind === "text") {
    return node.text === token.text;
  }

  return (
    node.digits === token.digits &&
    node.prefix === token.prefix &&
    node.suffix === token.suffix
  );
}

function createTokenNode(token: FlowToken): Node {
  if (token.kind === "text") {
    const span = document.createElement("span");

    span.className = "ma-digital-clock__text";
    span.textContent = token.text;
    return span;
  }

  const flow = document.createElement("number-flow") as NumberFlowElement;

  updateNumberFlow(flow, token);
  return flow;
}

function snapshotTokenNode(node: Node, token: FlowToken): FlowNodeState {
  if (token.kind === "text") {
    return {
      kind: "text",
      node,
      text: token.text,
    };
  }

  return {
    kind: "number",
    node,
    digits: token.digits,
    prefix: token.prefix,
    suffix: token.suffix,
    value: token.value,
  };
}

function updateNumberFlow(flow: NumberFlowElement, token: Extract<FlowToken, { kind: "number" }>) {
  flow.numberPrefix = token.prefix;
  flow.numberSuffix = token.suffix;
  flow.format = { minimumIntegerDigits: token.digits };
  flow.animated = true;
  flow.update(token.value);
}

type NumberFlowElement = HTMLElement & {
  animated: boolean;
  format?: Intl.NumberFormatOptions;
  numberPrefix?: string;
  numberSuffix?: string;
  update: (value?: number) => void;
};

function tokenizeNumberFlow(text: string): FlowToken[] {
  const tokens: FlowToken[] = [];
  const matches = [...text.matchAll(/\d+/g)];

  if (matches.length === 0) {
    return [];
  }

  let pendingPrefix = "";
  let cursor = 0;

  for (const match of matches) {
    const index = match.index ?? 0;
    const leadingText = text.slice(cursor, index);
    const digits = match[0] ?? "";

    if (tokens.length === 0) {
      pendingPrefix = leadingText;
    } else {
      pendingPrefix = leadingText;
    }

    tokens.push({
      digits: digits.length,
      kind: "number",
      prefix: pendingPrefix,
      suffix: "",
      value: Number(digits),
    });
    cursor = index + digits.length;
  }

  const trailingText = text.slice(cursor);
  const lastToken = tokens[tokens.length - 1];

  if (lastToken && lastToken.kind === "number") {
    lastToken.suffix = trailingText;
  }

  return tokens;
}

function readAlign(settings: Record<string, unknown>) {
  const align = stringSettingValue(settings, "align", "center");

  return align === "left" || align === "right" ? align : "center";
}

function readSectionType(settings: Record<string, unknown>, key: string): SectionType {
  const value = stringSettingValue(settings, key, "time");

  return value === "custom" || value === "date" ? value : "time";
}

function readPositionSetting(value: unknown): PositionValue {
  if (!isRecord(value)) {
    return defaultPosition;
  }

  return {
    x: readLengthValue(value.x, defaultPosition.x),
    y: readLengthValue(value.y, defaultPosition.y),
  };
}

function readLengthValue(value: unknown, fallback: LengthValue): LengthValue {
  if (!isRecord(value)) {
    return fallback;
  }

  return typeof value.value === "number" && isLengthUnit(value.unit)
    ? { value: value.value, unit: value.unit }
    : fallback;
}

function lengthToCss(value: LengthValue) {
  return `${value.value}${value.unit}`;
}

function currentLocale() {
  return navigator.language.toLowerCase().startsWith("zh") ? zhCN : enUS;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function isLengthUnit(value: unknown): value is LengthValue["unit"] {
  return value === "%" || value === "px";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
