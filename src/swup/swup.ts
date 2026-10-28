import Swup from "swup";
import { registerSwupHooks } from "./hooks";

declare global {
  interface Window {
    __swup__?: Swup;
  }
}

let swupInstance: Swup | null = null;

const isSwupEnabled = () => window.themeConfig?.custom?.enable_swup === true;

export const initSwup = () => {
  if (!isSwupEnabled()) {
    return null;
  }
  if (swupInstance) return swupInstance;

  const timeout = window.themeConfig?.custom?.swup_timeout || 5000;

  swupInstance = new Swup({
    containers: ["#main-content", "#z-aside-track", "#z-panel-anchor", "#z-footer"],
    animationSelector: false,
    animateHistoryBrowsing: true,
    linkSelector: "a[href]",
    timeout,
    cache: true,
    ignoreVisit: (_url, { el }) => {
      const link = el?.closest?.("a");
      return Boolean(
        link?.hasAttribute("data-no-swup") ||
          link?.getAttribute("target") === "_blank" ||
          link?.getAttribute("href")?.startsWith("#") ||
          link?.getAttribute("href")?.startsWith("javascript:"),
      );
    },
  });

  window.__swup__ = swupInstance;
  registerSwupHooks(swupInstance);

  return swupInstance;
};

export const getSwupInstance = () => swupInstance;

export const disableSwup = () => {
  if (!swupInstance) return;

  void swupInstance.destroy();
  swupInstance = null;
  window.__swup__ = undefined;
};

export const enableSwup = () => {
  if (!swupInstance && isSwupEnabled()) {
    initSwup();
  }
};
