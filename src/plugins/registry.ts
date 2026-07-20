import directionalPullRing from "./builtin/directional-pull-ring";
import classicCrosshair from "./builtin/classic-crosshair";
import digitalClock from "./builtin/digital-clock";
import fullscreenBorder from "./builtin/fullscreen-border";
import fullscreenGrid from "./builtin/fullscreen-grid";
import fullscreenReferenceLines from "./builtin/fullscreen-reference-lines";
import staticRing from "./builtin/static-ring";
import { createPluginDirectoryPayload } from "./definePlugin";
import type {
  PluginI18nResource,
  PluginModule,
  PluginOverridesPayload,
  PluginRegistration,
} from "./types";

export const registeredPlugins = [
  directionalPullRing,
  classicCrosshair,
  digitalClock,
  staticRing,
  fullscreenReferenceLines,
  fullscreenGrid,
  fullscreenBorder,
] satisfies PluginRegistration[];

export const registeredPluginIds = registeredPlugins.map((plugin) => plugin.id);

export const pluginI18nResources = registeredPlugins
  .map((plugin) => plugin.i18n)
  .filter((resource): resource is PluginI18nResource => Boolean(resource));

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
