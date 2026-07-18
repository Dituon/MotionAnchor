import { Accordion, Card, Chip, Typography } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PluginManifest } from "../../plugins/types";
import type { InputProfilePayload } from "../../tauri/types";
import type { Paint } from "../paint";
import { PluginAccordionItem } from "./PluginAccordionItem";
import { pluginKindRoutes, pluginKindSectionId } from "./pluginKindNavigation";

export function PluginKindSection({
  globalPaint,
  inputProfile,
  kind,
  onUpdateEnabled,
  onUpdateSetting,
  plugins,
}: {
  globalPaint: Paint;
  inputProfile: InputProfilePayload | null;
  kind: PluginManifest["kind"];
  onUpdateEnabled: (plugin: PluginManifest, enabled: boolean) => void;
  onUpdateSetting: (plugin: PluginManifest, key: string, value: unknown) => void;
  plugins: PluginManifest[];
}) {
  const { t } = useTranslation();
  const pluginKind = t(`pluginKinds.${kind}`);
  const route = pluginKindRoutes.find((candidate) => candidate.kind === kind);
  const Icon = route?.icon;

  return (
    <section className="scroll-mt-4" id={pluginKindSectionId(kind)}>
      <div className="mb-3 flex min-w-0 items-center gap-2">
        {Icon && <Icon aria-hidden="true" className="size-5 shrink-0 text-muted" />}
        <Typography.Heading className="text-lg font-semibold">{pluginKind}</Typography.Heading>
        <Chip size="sm" variant="secondary">
          <Chip.Label>{plugins.length}</Chip.Label>
        </Chip>
      </div>

      {plugins.length === 0 ? (
        <Card>
          <Card.Content>{t("settings.emptyPluginKind", { kind: pluginKind })}</Card.Content>
        </Card>
      ) : (
        <Accordion
          allowsMultipleExpanded
          className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))]"
          variant="surface"
        >
          {plugins.map((plugin) => (
            <PluginAccordionItem
              key={plugin.id}
              globalPaint={globalPaint}
              inputProfile={inputProfile}
              plugin={plugin}
              onUpdateEnabled={onUpdateEnabled}
              onUpdateSetting={onUpdateSetting}
            />
          ))}
        </Accordion>
      )}
    </section>
  );
}
