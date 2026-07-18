import type { InputVector2Payload } from "../tauri/types";
import type { PluginInputApi } from "../plugins/types";

type Vector2Handler = (value: { x: number; y: number }) => void;

type Vector2Listener = {
  handler: Vector2Handler;
  inputId: () => string | null;
};

const zeroVector2 = { x: 0, y: 0 };

export class InputRuntime {
  private readonly vector2Listeners = new Set<Vector2Listener>();
  private readonly vector2Values = new Map<string, { x: number; y: number }>();

  createPluginApi(getSettings: () => Record<string, unknown>): PluginInputApi {
    const resolveInputId = (settingKey: string) => {
      const value = getSettings()[settingKey];
      return typeof value === "string" && value.length > 0 ? value : null;
    };

    return {
      vector2: {
        get: (settingKey) => {
          const inputId = resolveInputId(settingKey);
          return inputId ? (this.vector2Values.get(inputId) ?? zeroVector2) : zeroVector2;
        },
        on: (settingKey, handler) => {
          const listener: Vector2Listener = {
            handler,
            inputId: () => resolveInputId(settingKey),
          };

          this.vector2Listeners.add(listener);
          return () => this.vector2Listeners.delete(listener);
        },
      },
    };
  }

  pushVector2(payload: InputVector2Payload) {
    const value = { x: payload.x, y: payload.y };

    this.vector2Values.set(payload.id, value);

    for (const listener of this.vector2Listeners) {
      if (listener.inputId() === payload.id) {
        listener.handler(value);
      }
    }
  }
}
