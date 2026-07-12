import directionalPullRing from "./builtin/directional-pull-ring";
import fullscreenBorder from "./builtin/fullscreen-border";
import fullscreenGrid from "./builtin/fullscreen-grid";
import fullscreenReferenceLines from "./builtin/fullscreen-reference-lines";
import staticRing from "./builtin/static-ring";
import { createPluginDirectoryPayload } from "./definePlugin";
import type { PluginModule, PluginOverridesPayload, PluginRegistration } from "./types";

export const registeredPlugins = [
  directionalPullRing,
  staticRing,
  fullscreenReferenceLines,
  fullscreenGrid,
  fullscreenBorder,
] satisfies PluginRegistration[];

export const registeredPluginIds = registeredPlugins.map((plugin) => plugin.id);

export const pluginModules: Record<string, PluginModule> = Object.fromEntries(
  registeredPlugins.map((plugin) => [plugin.id, { mount: plugin.mount }]),
);

export function createPluginsPayload(overrides: PluginOverridesPayload) {
  return createPluginDirectoryPayload(registeredPlugins, overrides);
}

export function emptyPluginOverrides(root = "Plugin overrides") {
  return {
    root,
    plugins: {},
  } satisfies PluginOverridesPayload;
}
