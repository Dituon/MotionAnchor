import { Card, Table } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { ResolvedLanguage } from "../preferences/types";
import type { RawMouseDebugPayload } from "../tauri/types";

function formatDebugNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.round(value).toLocaleString();
}

function formatDebugTime(value: number | null, language: ResolvedLanguage, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleTimeString(language);
}

export function RawMouseDebugPanel({
  appVersion,
  debug,
}: {
  appVersion: string;
  debug: RawMouseDebugPayload | null;
}) {
  const { i18n: currentI18n, t } = useTranslation();
  const status = debug?.status ?? "loading";
  const message = debug?.message ?? t("diagnostics.loadingMessage");
  const language = currentI18n.language.startsWith("zh") ? "zh" : "en";
  const rows = [
    [t("diagnostics.appVersion"), appVersion],
    [t("diagnostics.status"), status],
    [t("diagnostics.mice"), formatDebugNumber(debug?.mouseCount ?? 0)],
    [t("diagnostics.polls"), formatDebugNumber(debug?.pollCount ?? 0)],
    [t("diagnostics.emptyPolls"), formatDebugNumber(debug?.emptyPollCount ?? 0)],
    [t("diagnostics.events"), formatDebugNumber(debug?.eventCount ?? 0)],
    [t("diagnostics.lastEvent"), formatDebugTime(debug?.lastEventAtMs ?? null, language, t("diagnostics.never"))],
    [t("diagnostics.dxDy"), `${debug?.lastDx ?? 0} / ${debug?.lastDy ?? 0}`],
    [t("diagnostics.speed"), formatDebugNumber(debug?.lastSpeed ?? 0)],
    [t("diagnostics.acceleration"), formatDebugNumber(debug?.lastAcceleration ?? 0)],
  ] as const;

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("diagnostics.rawInputTitle")}</Card.Title>
          <Card.Description>{message}</Card.Description>
        </div>
        <span>{debug?.running ? t("diagnostics.running") : status}</span>
      </Card.Header>
      <Card.Content>
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label={t("diagnostics.rawInputTitle")}>
              <Table.Header>
                <Table.Column isRowHeader>{t("diagnostics.metric")}</Table.Column>
                <Table.Column>{t("diagnostics.value")}</Table.Column>
              </Table.Header>
              <Table.Body>
                {rows.map(([metric, value]) => (
                  <Table.Row key={metric} id={metric}>
                    <Table.Cell>{metric}</Table.Cell>
                    <Table.Cell>{value}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}
