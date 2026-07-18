export type InputProfilePayload = {
  vector2: Vector2InputBinding[];
};

export type InputStatusPayload = {
  status: string;
  message: string;
};

export type InputVector2Payload = {
  id: string;
  x: number;
  y: number;
};

export type Vector2InputBinding = {
  id: string;
  label: string;
  sources: Vector2InputSource[];
};

export type Vector2InputSource =
  | {
      type: "mouseMotion";
      scale: number;
      invertX: boolean;
      invertY: boolean;
    }
  | {
      type: "keyboardWasd";
      scale: number;
      invertX: boolean;
      invertY: boolean;
    }
  | {
      type: "gamepadStick";
      deviceId: number | null;
      stick: "left" | "right";
      deadzone: number;
      scale: number;
      invertX: boolean;
      invertY: boolean;
    };
