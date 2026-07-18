import { useEffect, useState } from "react";
import { Accordion, Chip, Typography } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PluginEnvironment } from "../plugins/environment";
import type { InputProfilePayload, InputStatusPayload } from "../tauri/types";
import { InputSettingsPanel } from "./InputSettingsPanel";
import { PluginEnvironmentPanel } from "./PluginEnvironmentPanel";
import type { SettingsRuntime } from "./settingsRuntime";

type InputChipColor = "default" | "success" | "warning" | "danger";

function getInputStatusColor(status: string, enabled: boolean): InputChipColor {
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
  const [inputEnabled, setInputEnabled] = useState(false);
  const [inputProfile, setInputProfile] = useState<InputProfilePayload | null>(null);
  const [inputStatus, setInputStatus] = useState<InputStatusPayload | null>(null);
  const runtimeStatus = inputStatus?.status ?? (inputEnabled ? "listening" : "stopped");
  const runtimeStatusLabel = t(`diagnostics.inputStatus.${runtimeStatus}`, {
    defaultValue: runtimeStatus,
  });

  useEffect(() => {
    let cancelled = false;
    let unlistenInputProfile: (() => void) | undefined;
    let unlistenInputStatus: (() => void) | undefined;

    runtime
      .getPluginEnvironment()
      .then((environment) => {
        if (!cancelled) {
          setPluginEnvironment(environment);
        }
      })
      .catch((caught) => onError(String(caught)));
    runtime
      .getInputEnabled()
      .then((enabled) => {
        if (!cancelled) {
          setInputEnabled(enabled);
        }
      })
      .catch((caught) => onError(String(caught)));
    runtime
      .getInputProfile()
      .then((profile) => {
        if (!cancelled) {
          setInputProfile(profile);
        }
      })
      .catch((caught) => onError(String(caught)));
    runtime
      .listenInputProfile(setInputProfile)
      .then((unlisten) => {
        unlistenInputProfile = unlisten;
      })
      .catch((caught) => onError(String(caught)));
    runtime
      .listenInputStatus((status) => {
        setInputStatus(status);

        if (status.status === "listening") {
          setInputEnabled(true);
        } else if (status.status === "stopped" || status.status === "error" || status.status === "unsupported") {
          setInputEnabled(false);
        }
      })
      .then((unlisten) => {
        unlistenInputStatus = unlisten;
      })
      .catch((caught) => onError(String(caught)));

    return () => {
      cancelled = true;
      unlistenInputProfile?.();
      unlistenInputStatus?.();
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

  const updateInputProfile = async (profile: InputProfilePayload) => {
    try {
      onError(null);
      setInputProfile(await runtime.setInputProfile(profile));
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
              <span className="block text-xs text-muted">{t("diagnostics.inputDescription")}</span>
            </span>
            <Chip
              className="max-w-[11rem] shrink-0"
              color={getInputStatusColor(runtimeStatus, inputEnabled)}
              size="sm"
              variant="primary"
            >
              <Chip.Label className="truncate">
                {t("diagnostics.inputLabel")}: {runtimeStatusLabel}
              </Chip.Label>
            </Chip>
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="grid gap-3 px-2 pb-2 pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
            {inputStatus?.message && (
              <Typography.Paragraph className="text-xs text-muted [grid-column:1/-1]">
                {inputStatus.message}
              </Typography.Paragraph>
            )}
            <PluginEnvironmentPanel environment={pluginEnvironment} onEnvironmentChange={updatePluginEnvironment} />
            <InputSettingsPanel profile={inputProfile} onProfileChange={updateInputProfile} />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
