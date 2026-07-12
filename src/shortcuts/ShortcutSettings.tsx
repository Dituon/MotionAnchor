import { useCallback, useMemo, useState } from "react";
import { Alert, Button, Card, Separator } from "@heroui/react";
import { Keyboard, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PluginManifest } from "../plugins/types";
import type { SettingsRuntime } from "../settings/settingsRuntime";
import { ShortcutKeys } from "./ShortcutKeys";
import { ShortcutRecorder } from "./ShortcutRecorder";
import type { ShortcutAction } from "./types";
import { useShortcutSettings } from "./useShortcutSettings";

function ActionRow({
  action,
  isBusy,
  isRecording,
  label,
  onAdd,
  onCancelRecording,
  onRecord,
  onRemove,
}: {
  action: ShortcutAction;
  isBusy: boolean;
  isRecording: boolean;
  label: string;
  onAdd: () => void;
  onCancelRecording: () => void;
  onRecord: (shortcut: string) => void;
  onRemove: (shortcut: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2 py-4">
      <div className="flex min-w-0 items-center gap-1">
        <span className="text-sm font-medium">{label}</span>
        <Button
          isIconOnly
          aria-label={t("shortcuts.add")}
          isDisabled={isBusy || isRecording}
          size="sm"
          variant="ghost"
          onPress={onAdd}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <div className="grid min-w-0 gap-1">
        {action.shortcuts.length === 0 && !isRecording && (
          <span className="py-2 text-sm text-muted">{t("shortcuts.unassigned")}</span>
        )}
        {action.shortcuts.map((shortcut) => (
          <div className="flex min-h-10 min-w-0 items-center justify-between gap-3 rounded-sm bg-surface-secondary px-3" key={shortcut}>
            <ShortcutKeys value={shortcut} />
            <Button
              isIconOnly
              aria-label={t("shortcuts.remove")}
              isDisabled={isBusy}
              size="sm"
              variant="ghost"
              onPress={() => onRemove(shortcut)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ))}
        {isRecording && <ShortcutRecorder onCancel={onCancelRecording} onRecord={onRecord} />}
      </div>
    </div>
  );
}

function ActionGroup({
  actions,
  busyAction,
  recordingAction,
  onAdd,
  onCancelRecording,
  onRecord,
  onRemove,
  title,
}: {
  actions: ShortcutAction[];
  busyAction: string | null;
  recordingAction: ShortcutAction | null;
  onAdd: (action: ShortcutAction) => void;
  onCancelRecording: () => void;
  onRecord: (shortcut: string) => void;
  onRemove: (action: ShortcutAction, shortcut: string) => void;
  title: string;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Content>
        {actions.map((action, index) => (
          <div key={action.id}>
            {index > 0 && <Separator />}
            <ActionRow
              action={action}
              isBusy={busyAction === action.id}
              isRecording={recordingAction?.id === action.id}
              label={t(`shortcuts.actions.${action.operation}`)}
              onAdd={() => onAdd(action)}
              onCancelRecording={onCancelRecording}
              onRecord={onRecord}
              onRemove={(shortcut) => onRemove(action, shortcut)}
            />
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}

export function ShortcutSettings({ plugins, runtime }: { plugins: PluginManifest[]; runtime: SettingsRuntime }) {
  const { t } = useTranslation();
  const { busyAction, error, payload, update } = useShortcutSettings(runtime);
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const pluginNames = useMemo(
    () =>
      new Map(
        plugins.map((plugin) => [
          plugin.id,
          t(`plugins.${plugin.id}.name`, { defaultValue: plugin.name }),
        ]),
      ),
    [plugins, t],
  );
  const appActions = payload?.actions.filter((action) => action.scope === "app") ?? [];
  const pluginGroups = useMemo(() => {
    const groups = new Map<string, ShortcutAction[]>();

    for (const action of payload?.actions ?? []) {
      if (action.scope === "plugin" && action.pluginId) {
        groups.set(action.pluginId, [...(groups.get(action.pluginId) ?? []), action]);
      }
    }

    return groups;
  }, [payload]);

  const cancelRecording = useCallback(() => setRecording(null), []);
  const recordShortcut = useCallback(
    (shortcut: string) => {
      if (!recording) {
        return;
      }

      const action = recording;
      setRecording(null);
      void update(action.id, [...action.shortcuts, shortcut]);
    },
    [recording, update],
  );

  return (
    <div className="grid gap-3">
      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("shortcuts.errorTitle")}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Card>
        <Card.Header>
          <Keyboard aria-hidden="true" />
          <div>
            <Card.Title>{t("shortcuts.title")}</Card.Title>
            <Card.Description>{t("shortcuts.description")}</Card.Description>
          </div>
        </Card.Header>
      </Card>

      <ActionGroup
        actions={appActions}
        busyAction={busyAction}
        recordingAction={recording}
        title={t("shortcuts.application")}
        onAdd={setRecording}
        onCancelRecording={cancelRecording}
        onRecord={recordShortcut}
        onRemove={(action, shortcut) => void update(action.id, action.shortcuts.filter((value) => value !== shortcut))}
      />

      {Array.from(pluginGroups, ([pluginId, actions]) => (
        <ActionGroup
          key={pluginId}
          actions={actions}
          busyAction={busyAction}
          recordingAction={recording}
          title={pluginNames.get(pluginId) ?? pluginId}
          onAdd={setRecording}
          onCancelRecording={cancelRecording}
          onRecord={recordShortcut}
          onRemove={(action, shortcut) => void update(action.id, action.shortcuts.filter((value) => value !== shortcut))}
        />
      ))}
    </div>
  );
}
