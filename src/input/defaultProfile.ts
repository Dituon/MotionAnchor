import type { InputProfilePayload } from "../tauri/types";

export const defaultInputProfile: InputProfilePayload = {
  vector2: [
    {
      id: "look",
      label: "Look",
      sources: [
        { type: "mouseMotion", scale: 1, invertX: false, invertY: false },
        {
          type: "gamepadStick",
          deviceId: null,
          stick: "right",
          deadzone: 0.15,
          scale: 32,
          invertX: false,
          invertY: false,
        },
      ],
    },
    {
      id: "move",
      label: "Move",
      sources: [
        { type: "keyboardWasd", scale: 1, invertX: false, invertY: false },
        {
          type: "gamepadStick",
          deviceId: null,
          stick: "left",
          deadzone: 0.15,
          scale: 1,
          invertX: false,
          invertY: false,
        },
      ],
    },
  ],
};
