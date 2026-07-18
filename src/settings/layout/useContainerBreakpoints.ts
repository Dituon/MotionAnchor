import { useCallback, useState } from "react";

import { themeScreens } from "../../../tailwind.config";

type BreakpointKey = keyof typeof themeScreens;

export function useContainerBreakpoints() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }

    const update = () => setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(update);

    update();
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return {
    ref,
    isSm: width >= breakpointPx("sm"),
    isMd: width >= breakpointPx("md"),
  };
}

function breakpointPx(key: BreakpointKey) {
  const value = themeScreens[key];

  if (value.endsWith("rem")) {
    return Number.parseFloat(value) * rootFontSize();
  }

  if (value.endsWith("px")) {
    return Number.parseFloat(value);
  }

  return Number.parseFloat(value);
}

function rootFontSize() {
  if (typeof window === "undefined") {
    return 16;
  }

  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}
