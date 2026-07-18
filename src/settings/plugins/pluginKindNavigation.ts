import { Box, Crosshair, LayoutGrid } from "lucide-react";
import type { ComponentType } from "react";

import { PluginKind, type PluginManifest } from "../../plugins/types";

type PluginKindIcon = ComponentType<{ "aria-hidden": "true"; className?: string }>;

export const pluginKindRoutes = [
  { icon: Crosshair, kind: PluginKind.Crosshair },
  { icon: LayoutGrid, kind: PluginKind.Layout },
  { icon: Box, kind: PluginKind.Component },
] as const satisfies ReadonlyArray<{ icon: PluginKindIcon; kind: PluginManifest["kind"] }>;

export function pluginKindSectionId(kind: PluginManifest["kind"]) {
  return `plugins-${kind}`;
}
