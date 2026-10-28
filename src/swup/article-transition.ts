import type Swup from "swup";
import type { Visit } from "swup";

const ROOT_ATTRIBUTE = "data-article-transition";

function path(url: string): string {
  return new URL(url, window.location.origin).pathname.replace(/\/$/, "") || "/";
}

function candidates(root: ParentNode, url: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-article-key]")).filter(
    (element) => path(element.dataset.articleKey!) === path(url),
  );
}

function visible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < innerHeight &&
    rect.bottom > 0 &&
    rect.left < innerWidth &&
    rect.right > 0 &&
    getComputedStyle(element).visibility !== "hidden"
  );
}

function sharedPair(visit: Visit): { source: HTMLElement; key: string } | undefined {
  const incoming = visit.to.document;
  if (!incoming) return;
  const entering = incoming.querySelector<HTMLElement>(".post-header[data-article-key]");
  const leaving = document.querySelector<HTMLElement>(".post-header[data-article-key]");
  const key = entering?.dataset.articleKey ?? leaving?.dataset.articleKey;
  if (!key || !candidates(incoming, key).length) return;
  const clicked = visit.trigger.el?.closest<HTMLElement>("[data-article-key]");
  const source =
    clicked && path(clicked.dataset.articleKey!) === path(key) && visible(clicked)
      ? clicked
      : candidates(document, key).find(visible);
  if (source) return { source, key };
  return undefined;
}

/** Capture only after the HTML is loaded, so a slow request never freezes the old page. */
export function registerArticleTransition(swup: Swup) {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active: { transition: ViewTransition; key: string; cleanup: () => void } | undefined;
  let uaTransition = false;

  const cancel = () => {
    active?.transition.skipTransition();
    active?.cleanup();
  };
  swup.hooks.on("visit:start", (visit) => {
    cancel();
    visit.animation.wait = true;
    visit.animation.native = false;
    if (reducedMotion.matches || root.dataset.pageTransition === "none") visit.animation.animate = false;
  });
  swup.hooks.on("page:view", () => {
    if (!active) return;
    const target = candidates(document, active.key).find(visible);
    if (target) {
      target.setAttribute("data-article-shared", "");
      root.style.setProperty("--article-radius-to", getComputedStyle(target).borderRadius);
    }
  });

  swup.hooks.replace("visit:transition", async (visit, args, defaultHandler) => {
    const pair = sharedPair(visit);
    const hasOverlay = document.querySelector(".poster-modal[style*='flex'], dialog[open], .fancybox__container");
    if (
      !document.startViewTransition ||
      !visit.animation.animate ||
      reducedMotion.matches ||
      hasOverlay ||
      visit.to.hash ||
      visit.from.hash ||
      !pair ||
      !visit.to.html ||
      root.dataset.themeTransition ||
      uaTransition
    ) {
      return defaultHandler?.(visit, args);
    }

    root.setAttribute(ROOT_ATTRIBUTE, "");
    pair.source.setAttribute("data-article-shared", "");
    root.style.setProperty("--article-radius-from", getComputedStyle(pair.source).borderRadius);
    document.body.classList.remove("swup-loading");
    window.dispatchEvent(new Event("clarity:transition-capture"));
    let timer = 0;
    let cleaned = false;
    let rendered: Promise<void> | undefined;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      document
        .querySelectorAll("[data-article-shared]")
        .forEach((element) => element.removeAttribute("data-article-shared"));
      document.getElementById("main-content")?.classList.remove("swup-content");
      root.removeAttribute(ROOT_ATTRIBUTE);
      root.style.removeProperty("--article-radius-from");
      root.style.removeProperty("--article-radius-to");
      active = undefined;
    };
    const render = () =>
      (rendered ??= (async () => {
        // The default handler owns rendering, scrolling and page:view hooks.
        // Disable its CSS animation waits while the browser handles the snapshots.
        visit.animation.animate = false;
        await defaultHandler?.(visit, args);
      })());

    try {
      const transition = document.startViewTransition(render);
      active = { transition, key: pair.key, cleanup };
      timer = window.setTimeout(() => transition.skipTransition(), 2000);
      // A rejected snapshot should fall back to navigation, never render the page twice.
      void transition.ready.catch(() => transition.skipTransition());
      await transition.updateCallbackDone;
      await transition.finished.catch(() => {});
    } catch (error) {
      if (rendered) await rendered;
      else if (!visit.done) await render();
      if (visit.done) throw error;
    } finally {
      cleanup();
    }
    return undefined;
  });

  swup.hooks.on(
    "history:popstate",
    (_visit, { event }) => {
      uaTransition = (event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition === true;
    },
    { before: true },
  );
  swup.hooks.on("visit:end", () => {
    uaTransition = false;
  });
  swup.hooks.on("visit:abort", cancel);
  swup.hooks.on("fetch:error", cancel);
  swup.hooks.on("fetch:timeout", cancel);
  swup.hooks.on("disable", cancel);
  window.addEventListener("clarity:cancel-transition", cancel);
  swup.hooks.on("disable", () => window.removeEventListener("clarity:cancel-transition", cancel));
}
