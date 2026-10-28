import EmblaCarousel from "embla-carousel";
import Autoplay from "embla-carousel-autoplay";

/** Each carousel owns its listeners and timer; Swup releases them before replacing the page. */
export function mountSlides(): () => void {
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>(".z-slide").forEach((section) => {
    const viewport = section.querySelector<HTMLElement>(".slide-viewport");
    const container = viewport?.querySelector<HTMLElement>(".slide-list");
    if (!viewport || !container || container.children.length < 2) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const autoplay = Autoplay({ delay: 5000, playOnInit: false, stopOnInteraction: true, stopOnFocusIn: false });
    const abort = new AbortController();
    let paused = reducedMotion.matches;
    let hovered = false;
    let dragging = false;
    let visible = false;
    let lastWheel = 0;

    viewport.classList.add("is-enhanced");
    const carousel = EmblaCarousel(
      viewport,
      {
        container,
        loop: true,
        align: "center",
        containScroll: false,
        skipSnaps: true,
        direction: getComputedStyle(container).direction === "rtl" ? "rtl" : "ltr",
        duration: reducedMotion.matches ? 0 : 25,
      },
      [autoplay],
    );

    const toggle = section.querySelector<HTMLButtonElement>("[data-slide-autoplay]");
    const previous = section.querySelector<HTMLButtonElement>("[data-slide-prev]");
    const next = section.querySelector<HTMLButtonElement>("[data-slide-next]");

    const update = () => {
      const canMove = carousel.scrollSnapList().length > 1;
      if (previous) previous.disabled = !carousel.canScrollPrev();
      if (next) next.disabled = !carousel.canScrollNext();
      if (toggle) {
        toggle.hidden = !canMove;
        toggle.setAttribute("aria-pressed", String(!paused));
        toggle.setAttribute("aria-label", paused ? "播放轮播" : "暂停轮播");
        toggle.setAttribute("title", paused ? "播放轮播" : "暂停轮播");
      }
      if (
        !paused &&
        !hovered &&
        !dragging &&
        visible &&
        !document.hidden &&
        !section.contains(document.activeElement) &&
        canMove
      ) {
        autoplay.play();
      } else {
        autoplay.stop();
      }
    };

    const move = (direction: number) => {
      if (direction < 0) carousel.scrollPrev(reducedMotion.matches);
      else carousel.scrollNext(reducedMotion.matches);
      autoplay.reset();
    };

    previous?.addEventListener("click", () => move(-1), { signal: abort.signal });
    next?.addEventListener("click", () => move(1), { signal: abort.signal });
    toggle?.addEventListener(
      "click",
      () => {
        paused = !paused;
        update();
      },
      { signal: abort.signal },
    );
    section.addEventListener(
      "mouseenter",
      () => {
        hovered = true;
        update();
      },
      { signal: abort.signal },
    );
    section.addEventListener(
      "mouseleave",
      () => {
        hovered = false;
        update();
      },
      { signal: abort.signal },
    );
    section.addEventListener("focusin", update, { signal: abort.signal });
    section.addEventListener("focusout", () => queueMicrotask(update), { signal: abort.signal });
    document.addEventListener("visibilitychange", update, { signal: abort.signal });
    reducedMotion.addEventListener(
      "change",
      () => {
        paused = reducedMotion.matches;
        carousel.reInit({ duration: reducedMotion.matches ? 0 : 25 });
        update();
      },
      { signal: abort.signal },
    );

    viewport.addEventListener(
      "keydown",
      (event) => {
        if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable]"))
          return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        move(getComputedStyle(container).direction === "rtl" ? -direction : direction);
      },
      { signal: abort.signal },
    );

    viewport.addEventListener(
      "wheel",
      (event) => {
        // Keep vertical page scrolling and browser pinch-to-zoom intact.
        if (event.ctrlKey || (!event.shiftKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX))) return;
        const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
        if (!delta || carousel.scrollSnapList().length < 2) return;
        event.preventDefault();
        if (performance.now() - lastWheel < 250) return;
        lastWheel = performance.now();
        move(delta > 0 ? 1 : -1);
      },
      { passive: false, signal: abort.signal },
    );

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(section);
    carousel
      .on("select", update)
      .on("reInit", update)
      .on("pointerDown", () => {
        dragging = true;
        update();
      })
      .on("pointerUp", () => {
        dragging = false;
        update();
      });
    update();

    cleanups.push(() => {
      observer.disconnect();
      abort.abort();
      carousel.destroy();
      viewport.classList.remove("is-enhanced");
    });
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
