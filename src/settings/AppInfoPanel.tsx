import { Card, Link, Typography } from "@heroui/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SettingsRuntime } from "./settingsRuntime";

const qqGroupUrl = "https://qm.qq.com/q/q2VsVEyemA";
const githubUrl = "https://github.com/Dituon/petpet/MotionAnchor";

function defaultOpenExternalUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function handleExternalLinkClick(url: string, openExternalUrl: (url: string) => void | Promise<void>) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault();
    void openExternalUrl(url);
  };
}

export function AppInfoPanel({
  openExternalUrl = defaultOpenExternalUrl,
  runtime,
}: {
  openExternalUrl?: (url: string) => void | Promise<void>;
  runtime: SettingsRuntime;
}) {
  const { i18n, t } = useTranslation();
  const [appVersion, setAppVersion] = useState("0.1.0");
  const isChinese =
    i18n.resolvedLanguage?.toLowerCase().startsWith("zh") || i18n.language.toLowerCase().startsWith("zh");

  useEffect(() => {
    let cancelled = false;

    runtime
      .getAppVersion()
      .then((version) => {
        if (!cancelled) {
          setAppVersion(version);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppVersion("0.1.0");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runtime]);

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("about.title")}</Card.Title>
          <Card.Description>{t("about.description")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4">
        <div className="grid gap-1">
          <Typography.Paragraph className="text-sm text-muted">{t("about.version")}</Typography.Paragraph>
          <Typography.Code>{appVersion}</Typography.Code>
        </div>

        <div className="grid gap-1">
          <Typography.Paragraph className="text-sm text-muted">{t("about.sourceCode")}</Typography.Paragraph>
          <Link
            href={githubUrl}
            onClick={handleExternalLinkClick(githubUrl, openExternalUrl)}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
            <Link.Icon />
          </Link>
        </div>

        {isChinese && (
          <div className="grid gap-1">
            <Typography.Paragraph className="text-sm text-muted">{t("about.qqGroup")}</Typography.Paragraph>
            <Link
              href={qqGroupUrl}
              onClick={handleExternalLinkClick(qqGroupUrl, openExternalUrl)}
              rel="noreferrer"
              target="_blank"
            >
              雾之湖 781804589
              <Link.Icon />
            </Link>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
