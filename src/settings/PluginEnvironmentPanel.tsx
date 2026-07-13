import { Card, ToggleButton } from "@heroui/react";
import { Bug } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PluginEnvironment } from "../plugins/environment";

export function PluginEnvironmentPanel({
  environment,
  onEnvironmentChange,
}: {
  environment: PluginEnvironment;
  onEnvironmentChange: (environment: PluginEnvironment) => void | Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("pluginEnvironment.title")}</Card.Title>
          <Card.Description>{t("pluginEnvironment.description")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content>
        <ToggleButton
          className="w-full justify-center"
          isSelected={environment.debug}
          onChange={(debug) => {
            void onEnvironmentChange({ ...environment, debug });
          }}
        >
          <Bug aria-hidden="true" />
          {environment.debug ? t("pluginEnvironment.debugEnabled") : t("pluginEnvironment.debugDisabled")}
        </ToggleButton>
      </Card.Content>
    </Card>
  );
}
