import { emit, emitTo } from "@tauri-apps/api/event";

import type { PluginEnvironment } from "./types";

export type { PluginEnvironment } from "./types";

export const pluginEnvironmentChangedEvent = "plugin-environment-changed";

const storageKey = "motionAnchor.pluginEnvironment";

export const defaultPluginEnvironment: PluginEnvironment = {
  debug: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getPluginEnvironment(): PluginEnvironment {
  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
      return defaultPluginEnvironment;
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isRecord(parsedValue)) {
      return defaultPluginEnvironment;
    }

    return {
      debug: typeof parsedValue.debug === "boolean" ? parsedValue.debug : defaultPluginEnvironment.debug,
    };
  } catch {
    return defaultPluginEnvironment;
  }
}

export function storePluginEnvironment(environment: PluginEnvironment) {
  const nextEnvironment = {
    debug: environment.debug === true,
  };

  localStorage.setItem(storageKey, JSON.stringify(nextEnvironment));
  return nextEnvironment;
}

export async function setPluginEnvironment(environment: PluginEnvironment) {
  const nextEnvironment = storePluginEnvironment(environment);

  await Promise.all([
    emit(pluginEnvironmentChangedEvent, nextEnvironment).catch(console.error),
    emitTo("main", pluginEnvironmentChangedEvent, nextEnvironment).catch(console.error),
  ]);

  return nextEnvironment;
}
