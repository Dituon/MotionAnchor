import { useEffect, useState } from "react";
import { Accordion, Chip, Typography } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PluginEnvironment } from "../plugins/environment";
import type { RawMouseSettingsPayload, RawMouseStatusPayload } from "../tauri/types";
import { PluginEnvironmentPanel } from "./PluginEnvironmentPanel";
import { RawMouseSettingsPanel } from "./RawMouseSettingsPanel";
import type { SettingsRuntime } from "./settingsRuntime";

type RawInputChipColor = "default" | "success" | "warning" | "danger";

function getRawInputStatusColor(status: string, enabled: boolean): RawInputChipColor {
  if (status === "error" || status === "unsupported") {
    return "danger";
  }

  if (status === "listening" || enabled) {
    return "success";
  }

  if (status === "stopped") {
    return "default";
  }

  return "warning";
}

export function DiagnosticsPanel({
  onError,
  runtime,
}: {
  onError: (error: string | null) => void;
  runtime: SettingsRuntime;
}) {
  const { t } = useTranslation();
  const [pluginEnvironment, setPluginEnvironment] = useState<PluginEnvironment>({ debug: false });
  const [rawMouseEnabled, setRawMouseEnabled] = useState(false);
  const [rawMouseSettings, setRawMouseSettings] = useState<RawMouseSettingsPayload | null>(null);
  const [rawMouseStatus, setRawMouseStatus] = useState<RawMouseStatusPayload | null>(null);
  const rawInputStatus = rawMouseStatus?.status ?? (rawMouseEnabled ? "listening" : "stopped");
  const rawInputStatusLabel = t(`diagnostics.rawInputStatus.${rawInputStatus}`, {
    defaultValue: rawInputStatus,
  });

  useEffect(() => {
    let cancelled = false;
    let unlistenRawMouseStatus: (() => void) | undefined;

    runtime
      .getPluginEnvironment()
      .then((environment) => {
        if (!cancelled) {
          setPluginEnvironment(environment);
        }
      })
      .catch((caught) => onError(String(caught)));
    runtime
      .getRawMouseEnabled()
      .then((enabled) => {
        if (!cancelled) {
          setRawMouseEnabled(enabled);
        }
      })
      .catch((caught) => onError(String(caught)));
    runtime
      .getRawMouseSettings()
      .then((settings) => {
        if (!cancelled) {
          setRawMouseSettings(settings);
        }
      })
      .catch((caught) => onError(String(caught)));
    runtime
      .listenRawMouseStatus((status) => {
        setRawMouseStatus(status);

        if (status.status === "listening") {
          setRawMouseEnabled(true);
        } else if (status.status === "stopped" || status.status === "error" || status.status === "unsupported") {
          setRawMouseEnabled(false);
        }
      })
      .then((unlisten) => {
        unlistenRawMouseStatus = unlisten;
      })
      .catch((caught) => onError(String(caught)));

    return () => {
      cancelled = true;
      unlistenRawMouseStatus?.();
    };
  }, [onError, runtime]);

  const updatePluginEnvironment = async (environment: PluginEnvironment) => {
    try {
      onError(null);
      setPluginEnvironment(await runtime.setPluginEnvironment(environment));
    } catch (caught) {
      onError(String(caught));
    }
  };

  const updateRawMouseMaxRefreshRate = async (maxRefreshRateHz: number | null) => {
    try {
      onError(null);
      setRawMouseSettings(await runtime.setRawMouseSettings(maxRefreshRateHz));
    } catch (caught) {
      onError(String(caught));
    }
  };

  return (
    <Accordion variant="surface">
      <Accordion.Item id="diagnostics">
        <Accordion.Heading>
          <Accordion.Trigger className="flex w-full items-center gap-2 text-left">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("nav.diagnostics")}</span>
              <span className="block text-xs text-muted">{t("diagnostics.rawInputDescription")}</span>
            </span>
            <Chip
              className="max-w-[11rem] shrink-0"
              color={getRawInputStatusColor(rawInputStatus, rawMouseEnabled)}
              size="sm"
              variant="primary"
            >
              <Chip.Label className="truncate">
                {t("diagnostics.rawInputLabel")}: {rawInputStatusLabel}
              </Chip.Label>
            </Chip>
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="grid gap-3 px-2 pb-2 pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
            {rawMouseStatus?.message && (
              <Typography.Paragraph className="text-xs text-muted [grid-column:1/-1]">
                {rawMouseStatus.message}
              </Typography.Paragraph>
            )}
            <PluginEnvironmentPanel environment={pluginEnvironment} onEnvironmentChange={updatePluginEnvironment} />
            <RawMouseSettingsPanel
              settings={rawMouseSettings}
              onMaxRefreshRateChange={updateRawMouseMaxRefreshRate}
            />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
