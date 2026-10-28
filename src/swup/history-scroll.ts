import type Swup from "swup";

/** A URL may occur more than once in history; save positions by Swup history index. */
export function registerHistoryScroll(swup: Swup) {
  const positions = new Map<number, { top: number; left: number }>();
  let currentIndex = window.history.state?.index ?? 1;

  swup.hooks.on("visit:start", () => {
    positions.set(currentIndex, { top: window.scrollY, left: window.scrollX });
    if (positions.size > 100) positions.delete(positions.keys().next().value!);
  });
  swup.hooks.replace("content:scroll", (visit, args, defaultHandler) => {
    if (visit.history.popstate) {
      const position = positions.get(window.history.state?.index);
      if (position) {
        window.scrollTo({ ...position, behavior: "instant" });
        return true;
      }
    }
    return defaultHandler ? defaultHandler(visit, args) : false;
  });
  swup.hooks.on("page:view", () => {
    currentIndex = window.history.state?.index ?? currentIndex;
  });
}
