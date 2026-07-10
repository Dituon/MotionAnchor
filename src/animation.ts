import { eases, utils } from "animejs";

export const animeRuntime = {
  eases,
  utils,
};

declare global {
  interface Window {
    MotionAnchorAnime: typeof animeRuntime;
  }
}

window.MotionAnchorAnime = animeRuntime;
