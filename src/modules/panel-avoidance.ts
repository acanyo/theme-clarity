/** Measure the fixed anchor, never the animated panel, to avoid feedback and jitter. */
export function mountPanelAvoidance(anchor: HTMLElement, panel: HTMLElement): () => void {
  const abort = new AbortController();
  const targets = Array.from(document.querySelectorAll<HTMLElement>(".sticky-pagination, [data-panel-avoid]"));
  let frame = 0;

  const update = () => {
    frame = 0;
    const rect = anchor.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const viewport = window.visualViewport;
    const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const viewportShift = Math.max(0, rect.bottom + 16 - visibleBottom);
    const bottom = rect.bottom - viewportShift;
    let shift = 0;

    targets.forEach((target) => {
      const box = target.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom <= 0 || box.top >= visibleBottom) return;
      if (rect.left < box.right && rect.right > box.left && rect.top - viewportShift < box.bottom && bottom > box.top) {
        shift = Math.max(shift, bottom - box.top + 16);
      }
    });

    // On very short screens keep the first button reachable above all other priorities.
    const maxShift = Math.max(0, rect.top - (viewport?.offsetTop ?? 0) - 8);
    panel.style.setProperty("--panel-shift", `${Math.min(maxShift, viewportShift + shift)}px`);
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const resize = new ResizeObserver(schedule);
  resize.observe(anchor);
  targets.forEach((target) => resize.observe(target));
  window.addEventListener("scroll", schedule, { capture: true, passive: true, signal: abort.signal });
  window.addEventListener("resize", schedule, { signal: abort.signal });
  window.visualViewport?.addEventListener("resize", schedule, { signal: abort.signal });
  window.visualViewport?.addEventListener("scroll", schedule, { signal: abort.signal });
  window.addEventListener("clarity:transition-capture", update, { signal: abort.signal });
  update();

  return () => {
    abort.abort();
    resize.disconnect();
    cancelAnimationFrame(frame);
    panel.style.removeProperty("--panel-shift");
  };
}
