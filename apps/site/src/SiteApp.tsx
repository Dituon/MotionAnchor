import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { Selection } from "@heroui/react";
import {
  Avatar,
  Button,
  ButtonGroup,
  Description,
  Dropdown,
  Label,
  Link,
  Spinner,
  Tag,
  TagGroup,
  Typography,
} from "@heroui/react";
import { ChevronDown, Code2, Download, MonitorPlay } from "lucide-react";
import { useTranslation } from "react-i18next";

import packageJson from "../../../package.json";
import iconUrl from "../../../src-tauri/icons/icon.png";
import { useAppPreferences } from "@motion-anchor/app/preferences/useAppPreferences";
import { createDemoSettingsRuntime, type DemoSettingsRuntime } from "./demoSettingsRuntime";
import { siteNamespace } from "./siteI18n";
import { sitePluginPresets } from "./siteDefaults";
import { SiteOverlayPreview } from "./SiteOverlayPreview";

const SettingsPage = lazy(() =>
  import("@motion-anchor/app/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);

const appVersion = packageJson.version;
const cnDownloadUrl =
  `https://ghfast.top/https://github.com/Dituon/MotionAnchor/releases/download/${appVersion}/motion-anchor.exe`;
const releaseUrl = "https://github.com/Dituon/MotionAnchor/releases";
const sourceUrl = "https://github.com/Dituon/MotionAnchor";

const pageWidth = "mx-auto w-[min(1120px,100%)]";
const softBorder = "border-foreground/15";
const row = "flex items-center";

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function isChineseLanguage(language?: string) {
  return language?.toLowerCase().startsWith("zh") ?? false;
}

function scrollToTrial() {
  const trial = document.getElementById("try");
  if (trial) {
    trial.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function SiteDownloadButton({
  className,
  expandOnMobile = false,
  label,
  size = "md",
}: {
  className?: string;
  expandOnMobile?: boolean;
  label: string;
  size?: "md" | "lg";
}) {
  const { i18n, t } = useTranslation(siteNamespace);
  const isChinese = isChineseLanguage(i18n.resolvedLanguage) || isChineseLanguage(i18n.language);
  const mobileButtonFill = expandOnMobile ? "max-[520px]:min-w-0 max-[520px]:flex-1" : undefined;

  if (!isChinese) {
    return (
      <Button className={className} size={size} variant="primary" onPress={() => openExternal(releaseUrl)}>
        <Download aria-hidden="true" />
        {label}
      </Button>
    );
  }

  return (
    <ButtonGroup className={className} size={size} variant="primary">
      <Button className={mobileButtonFill} onPress={() => openExternal(cnDownloadUrl)}>
        <Download aria-hidden="true" />
        {label}
      </Button>
      <Dropdown>
        <Button isIconOnly size={size} variant="primary">
          <ButtonGroup.Separator />
          <ChevronDown aria-hidden="true" />
        </Button>
        <Dropdown.Popover className="max-w-[290px]" placement="bottom end">
          <Dropdown.Menu
            onAction={(key) => {
              if (key === "github-release") {
                openExternal(releaseUrl);
              }
            }}
          >
            <Dropdown.Item
              className="flex flex-col items-start gap-1"
              id="github-release"
              textValue={t("download.releaseLabel")}
            >
              <Label>{t("download.releaseLabel")}</Label>
              <Description>{t("download.releaseDescription")}</Description>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </ButtonGroup>
  );
}

function selectionKey(keys: Selection) {
  if (keys === "all") {
    return null;
  }

  const key = Array.from(keys)[0];
  return typeof key === "string" ? key : null;
}

function SitePresetControls({ runtime }: { runtime: DemoSettingsRuntime }) {
  const { t } = useTranslation(siteNamespace);
  const [activePresetId, setActivePresetId] = useState(sitePluginPresets[0].id);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);

  useEffect(() => {
    const preset = sitePluginPresets.find((item) => item.id === activePresetId);

    if (preset) {
      runtime.applySitePluginPreset(preset).catch(console.error);
    }
  }, [activePresetId, runtime]);

  useEffect(() => {
    if (!autoSwitchEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      setActivePresetId((currentId) => {
        const currentIndex = sitePluginPresets.findIndex((preset) => preset.id === currentId);
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % sitePluginPresets.length;

        return sitePluginPresets[nextIndex].id;
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [autoSwitchEnabled]);

  return (
    <div className="grid gap-3">
      <TagGroup
        selectedKeys={new Set([activePresetId])}
        selectionMode="single"
        size="sm"
        variant="surface"
        onSelectionChange={(keys) => {
          const key = selectionKey(keys);
          const preset = sitePluginPresets.find((item) => item.id === key);

          if (preset) {
            setAutoSwitchEnabled(false);
            setActivePresetId(preset.id);
          }
        }}
      >
        <TagGroup.List className="gap-2">
          {sitePluginPresets.map((preset) => (
            <Tag key={preset.id} id={preset.id} textValue={t(`presets.${preset.id}`, { defaultValue: preset.label })}>
              <Avatar aria-hidden="true" className="size-4">
                <Avatar.Fallback
                  className="border-none text-[0px]"
                  style={{ backgroundColor: preset.themeColor }}
                >
                  {preset.label.slice(0, 1)}
                </Avatar.Fallback>
              </Avatar>
              {t(`presets.${preset.id}`, { defaultValue: preset.label })}
            </Tag>
          ))}
        </TagGroup.List>
      </TagGroup>
    </div>
  );
}

export function SiteApp() {
  const { t } = useTranslation(siteNamespace);
  const preferences = useAppPreferences();
  const runtime = useMemo(() => createDemoSettingsRuntime(), []);
  const heroActionWidth = "max-[520px]:w-[min(15rem,100%)]";

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section
        className="min-h-[92svh] border-b border-foreground/15 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--accent)_14%,transparent),transparent_48%),linear-gradient(315deg,color-mix(in_oklch,rgb(244_63_94)_10%,transparent),transparent_42%)] p-4"
      >
        <nav
          className={`${pageWidth} ${row} min-h-16 justify-between gap-4 max-[860px]:flex-col max-[860px]:items-start max-[860px]:py-3 max-[640px]:hidden`}
        >
          <a className={`${row} min-w-0 gap-2.5 font-bold text-foreground no-underline`} href="#top">
            <img alt="MotionAnchor icon" className="size-8" src={iconUrl} />
            <span>MotionAnchor</span>
          </a>
          <div className={`${row} gap-4 max-[520px]:w-full max-[520px]:flex-col max-[520px]:items-stretch`}>
            <Link href={sourceUrl} rel="noreferrer" target="_blank">
              GitHub
              <Link.Icon />
            </Link>
            <SiteDownloadButton label={t("download.button")} />
          </div>
        </nav>

        <div
          className={`${pageWidth} grid min-h-[calc(92svh-6rem)] grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center gap-10 py-12 pb-16 max-[860px]:grid-cols-1 max-[640px]:min-h-[92svh]`}
          id="top"
        >
          <div className="grid min-w-0 gap-5 max-[640px]:justify-items-center max-[640px]:text-center">
            <Typography.Heading className="max-w-[12ch] bg-gradient-to-r from-accent via-accent-hover to-accent-soft-foreground bg-clip-text text-5xl font-semibold leading-[0.94] tracking-tight text-balance text-transparent sm:text-7xl" level={1}>
              MotionAnchor
            </Typography.Heading>
            <Typography.Paragraph className="max-w-xl text-[1.15rem] text-muted max-[640px]:mx-auto">
              {t("hero.summary")}
            </Typography.Paragraph>
            <div className={`${row} flex-wrap justify-start gap-3 max-[640px]:justify-center max-[520px]:w-full max-[520px]:flex-col max-[520px]:items-center`}>
              <SiteDownloadButton
                className={heroActionWidth}
                expandOnMobile
                label={t("download.latest")}
                size="lg"
              />
              <Button className={heroActionWidth} size="lg" variant="secondary" onPress={scrollToTrial}>
                <MonitorPlay aria-hidden="true" />
                {t("hero.tryOnline")}
              </Button>
            </div>
          </div>

          <div className="grid w-[min(100%,32rem)] place-items-center justify-self-center max-[520px]:min-h-72">
            <SiteOverlayPreview runtime={runtime} />
          </div>
        </div>
      </section>

      <section
        className={`${pageWidth} grid grid-cols-[minmax(16rem,1fr)_minmax(0,460px)] items-start gap-6 px-4 pb-20 pt-4 max-[860px]:grid-cols-1`}
        id="try"
      >
        <div className="grid content-start gap-3 pt-2">
          <Typography.Heading level={2}>{t("trial.title")}</Typography.Heading>
          <Typography.Paragraph className="text-muted">
            {t("trial.summary")}
          </Typography.Paragraph>
          <div
            aria-hidden="true"
            className={`mt-4 aspect-[16/10] rounded-lg border border-dashed ${softBorder} bg-foreground/[0.03]`}
            id="trial-preview-slot"
          />
          <SitePresetControls runtime={runtime} />
        </div>

        <div className={`mx-auto h-[min(78svh,720px)] min-h-[32.5rem] w-[min(100%,460px)] overflow-hidden rounded-lg border ${softBorder} bg-background max-[860px]:h-[76svh] max-[520px]:min-h-[32rem]`}>
          <Suspense
            fallback={
              <div className="grid h-full place-items-center gap-3">
                <Spinner />
                <span>{t("trial.loading")}</span>
              </div>
            }
          >
            <SettingsPage preferences={preferences} runtime={runtime} />
          </Suspense>
        </div>
      </section>

      <footer className={`${pageWidth} ${row} min-h-20 justify-between gap-4 border-t ${softBorder} px-4 text-muted max-[520px]:flex-col max-[520px]:items-stretch`}>
        <span>MotionAnchor</span>
        <div className={`${row} gap-4 max-[520px]:flex-col max-[520px]:items-stretch`}>
          <Link href={releaseUrl} rel="noreferrer" target="_blank">
            {t("footer.releases")}
            <Link.Icon />
          </Link>
          <Link href={sourceUrl} rel="noreferrer" target="_blank">
            <Code2 aria-hidden="true" />
            {t("footer.source")}
          </Link>
        </div>
      </footer>
    </main>
  );
}
