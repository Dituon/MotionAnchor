import { Accordion, Card, Link, Typography } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PluginEnvironment } from "../plugins/environment";
import type { RawMouseSettingsPayload } from "../tauri/types";
import { PluginEnvironmentPanel } from "./PluginEnvironmentPanel";
import { RawMouseSettingsPanel } from "./RawMouseSettingsPanel";

const qqGroupUrl = "https://qm.qq.com/q/q2VsVEyemA";
const githubUrl = "https://github.com/Dituon/petpet/MotionAnchor";

function isChineseLanguage(language?: string) {
  return language?.toLowerCase().startsWith("zh") ?? false;
}

function defaultOpenExternalUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function handleExternalLinkClick(url: string, openExternalUrl: (url: string) => void | Promise<void>) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault();
    void openExternalUrl(url);
  };
}

export function AboutPanel({
  appVersion,
  pluginEnvironment,
  rawMouseSettings,
  openExternalUrl = defaultOpenExternalUrl,
  onPluginEnvironmentChange,
  onRawMouseMaxRefreshRateChange,
}: {
  appVersion: string;
  pluginEnvironment: PluginEnvironment;
  rawMouseSettings: RawMouseSettingsPayload | null;
  openExternalUrl?: (url: string) => void | Promise<void>;
  onPluginEnvironmentChange: (environment: PluginEnvironment) => void | Promise<void>;
  onRawMouseMaxRefreshRateChange: (maxRefreshRateHz: number | null) => void | Promise<void>;
}) {
  const { i18n, t } = useTranslation();
  const isChinese = isChineseLanguage(i18n.resolvedLanguage) || isChineseLanguage(i18n.language);
  const aboutText = isChinese
    ? {
        description: "轻量叠加层工具，用来在游戏和应用上建立更稳定的运动参考。",
        sourceCode: "源代码",
        title: "关于 MotionAnchor",
        version: "版本",
      }
    : {
        description: "A lightweight overlay tool for building steadier motion references on top of games and apps.",
        sourceCode: "Source code",
        title: "About MotionAnchor",
        version: "Version",
      };

  return (
    <div className="grid gap-3">
      <Card>
        <Card.Header>
          <div>
            <Card.Title>{aboutText.title}</Card.Title>
            <Card.Description>{aboutText.description}</Card.Description>
          </div>
        </Card.Header>
        <Card.Content className="grid gap-4">
          <div className="grid gap-1">
            <Typography.Paragraph className="text-sm text-muted">{aboutText.version}</Typography.Paragraph>
            <Typography.Code>{appVersion}</Typography.Code>
          </div>

          <div className="grid gap-1">
            <Typography.Paragraph className="text-sm text-muted">{aboutText.sourceCode}</Typography.Paragraph>
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
              <Typography.Paragraph className="text-sm text-muted">QQ群</Typography.Paragraph>
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

      <Accordion variant="surface">
        <Accordion.Item id="diagnostics">
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full text-left">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t("nav.diagnostics")}</span>
                <span className="block text-xs text-muted">{t("diagnostics.rawInputDescription")}</span>
              </span>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="grid gap-3 px-2 pb-2 pt-3">
              <PluginEnvironmentPanel
                environment={pluginEnvironment}
                onEnvironmentChange={onPluginEnvironmentChange}
              />
              <RawMouseSettingsPanel
                settings={rawMouseSettings}
                onMaxRefreshRateChange={onRawMouseMaxRefreshRateChange}
              />
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
