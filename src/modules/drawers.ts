import { mountPanelAvoidance } from "./panel-avoidance";

let cleanup: (() => void) | undefined;

/** Menu and aside share one state so their masks and focus never compete. */
export function initDrawers() {
  cleanup?.();
  const abort = new AbortController();
  const narrow = window.matchMedia("(max-width: 768px)");
  const tablet = window.matchMedia("(max-width: 1080px)");
  const panel = document.getElementById("z-panel");
  const anchor = document.getElementById("z-panel-anchor");
  const drawers = [
    {
      element: document.getElementById("z-sidebar"),
      button: document.getElementById("toggle-sidebar"),
      mask: document.getElementById("z-sidebar-bgmask"),
      query: narrow,
    },
    {
      element: document.getElementById("z-aside"),
      button: document.getElementById("toggle-aside"),
      mask: document.getElementById("z-aside-bgmask"),
      query: tablet,
    },
  ];
  let active: (typeof drawers)[number] | undefined;
  let restoreFocus: HTMLElement | null = null;
  let previousOverflow = "";

  const sync = () => {
    drawers.forEach((drawer) => {
      const open = drawer === active;
      drawer.element?.classList.toggle("show", open);
      drawer.button?.classList.toggle("active", open);
      drawer.button?.setAttribute("aria-expanded", String(open));
      drawer.mask?.classList.toggle("hidden", !open);
      if (drawer.element) drawer.element.inert = drawer.query.matches && !open;
    });
    panel?.classList.toggle("has-active", Boolean(active));
  };

  const close = (focus = true) => {
    if (active) {
      active = undefined;
      document.body.style.overflow = previousOverflow;
      if (focus) restoreFocus?.focus({ preventScroll: true });
    }
    sync();
  };

  drawers.forEach((drawer) => {
    drawer.button?.addEventListener(
      "click",
      () => {
        if (active === drawer) {
          close();
          return;
        }
        if (!active) previousOverflow = document.body.style.overflow;
        restoreFocus = drawer.button;
        active = drawer;
        document.body.style.overflow = "hidden";
        sync();
        drawer.element?.querySelector<HTMLElement>("a[href], button, input")?.focus({ preventScroll: true });
      },
      { signal: abort.signal },
    );
    drawer.mask?.addEventListener("click", () => close(), { signal: abort.signal });
    drawer.query.addEventListener(
      "change",
      () => {
        close(false);
        sync();
      },
      { signal: abort.signal },
    );
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!active) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        active.element?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input, select, textarea, [tabindex='0']",
        ) ?? [],
      ).filter((element) => element.getClientRects().length && !element.closest("[inert]"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      if (
        active &&
        event.target instanceof Element &&
        event.target.closest("a[href]") &&
        active.element?.contains(event.target)
      )
        close(false);
    },
    { signal: abort.signal },
  );
  window.addEventListener("swup:start", () => close(false), { signal: abort.signal });
  sync();

  const stopAvoidance = anchor && panel ? mountPanelAvoidance(anchor, panel) : undefined;
  cleanup = () => {
    close(false);
    abort.abort();
    stopAvoidance?.();
  };
}
