export type RawMouseSettingsPayload = {
  maxRefreshRateHz: number | null;
  defaultRefreshRateHz: number;
  effectiveRefreshRateHz: number;
};

export type RawMouseStatusPayload = {
  status: string;
  message: string;
};
