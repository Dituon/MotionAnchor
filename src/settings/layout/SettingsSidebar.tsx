import { Tabs } from "@heroui/react";
import { Home, Keyboard, Puzzle, Settings } from "lucide-react";
import type { ComponentType, Key } from "react";
import { useTranslation } from "react-i18next";

import type { PluginKind } from "../../plugins/types";
import { pluginKindRoutes } from "../plugins/pluginKindNavigation";
import type { SettingsSection } from "../model/settingsNavigation";

export function SettingsSidebar({
  activePluginKind,
  activeSection,
  isExpandedTopLayout,
  isSidebarLayout,
  onSelectPluginKind,
  onSelectSection,
}: {
  activePluginKind: PluginKind | null;
  activeSection: SettingsSection;
  isExpandedTopLayout: boolean;
  isSidebarLayout: boolean;
  onSelectPluginKind: (kind: PluginKind) => void;
  onSelectSection: (section: SettingsSection) => void;
}) {
  const { t } = useTranslation();
  const showPluginRoot = isSidebarLayout || !isExpandedTopLayout;
  const showPluginKinds = isSidebarLayout || isExpandedTopLayout;
  const selectedKey =
    activeSection === "plugins" && activePluginKind ? `plugins:${activePluginKind}` : activeSection;
  const tabLayoutClassName = isSidebarLayout ? "justify-start" : "";

  const selectTab = (key: Key) => {
    const nextKey = String(key);

    if (nextKey.startsWith("plugins:")) {
      onSelectPluginKind(nextKey.slice("plugins:".length) as PluginKind);
      return;
    }

    onSelectSection(nextKey as SettingsSection);
  };

  return (
    <aside
      className={cx(
        "shrink-0 border-b border-border/60 bg-surface/40",
        isSidebarLayout && "w-42 border-b-0 border-r",
      )}
    >
      <Tabs
        className={cx("block min-w-0 p-2", isSidebarLayout && "w-full")}
        orientation={isSidebarLayout ? "vertical" : "horizontal"}
        selectedKey={selectedKey}
        variant="secondary"
        onSelectionChange={selectTab}
      >
        <Tabs.ListContainer className="[&>.tabs__list-container__scroll-next]:!hidden [&>.tabs__list-container__scroll-prev]:!hidden">
          <Tabs.List className={cx("gap-1", isSidebarLayout && "w-full")}>
            <SettingsTab
              className={tabLayoutClassName}
              icon={Home}
              id="start"
              label={t("nav.start")}
            />
            {showPluginRoot && (
              <SettingsTab
                className={tabLayoutClassName}
                icon={Puzzle}
                id="plugins"
                label={t("nav.plugins")}
              />
            )}
            {showPluginKinds &&
              pluginKindRoutes.map((route) => (
                <SettingsTab
                  key={route.kind}
                  className={cx(tabLayoutClassName, isSidebarLayout && "ml-3 h-9 text-xs")}
                  icon={route.icon}
                  id={`plugins:${route.kind}`}
                  label={t(`pluginKinds.${route.kind}`)}
                />
              ))}
            <SettingsTab
              className={tabLayoutClassName}
              icon={Keyboard}
              id="shortcuts"
              label={t("nav.shortcuts")}
            />
            <SettingsTab
              className={tabLayoutClassName}
              icon={Settings}
              id="system"
              label={t("nav.system")}
            />
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </aside>
  );
}

function SettingsTab({
  className = "",
  icon: Icon,
  id,
  label,
}: {
  className?: string;
  icon: ComponentType<{ "aria-hidden": "true"; className?: string }>;
  id: string;
  label: string;
}) {
  return (
    <Tabs.Tab
      className={cx("h-10 min-w-0 gap-2 px-3 text-sm font-medium", className)}
      id={id}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      <Tabs.Indicator />
    </Tabs.Tab>
  );
}

function cx(...classNames: Array<string | false>) {
  return classNames.filter(Boolean).join(" ");
}
