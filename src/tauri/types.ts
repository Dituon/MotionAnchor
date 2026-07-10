export type RawMouseDebugPayload = {
  running: boolean;
  status: string;
  message: string;
  mouseCount: number;
  keyboardCount: number;
  joystickCount: number;
  pollCount: number;
  emptyPollCount: number;
  eventCount: number;
  lastEventAtMs: number | null;
  lastDx: number;
  lastDy: number;
  lastSpeed: number;
  lastAcceleration: number;
};
