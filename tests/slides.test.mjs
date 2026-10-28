import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./support/load-typescript.mjs";

class Element extends EventTarget {
  constructor() {
    super();
    this.attributes = new Map();
    this.classList = { add() {}, remove() {} };
  }
  setAttribute(key, value) {
    this.attributes.set(key, value);
  }
  matches() {
    return false;
  }
}

function carouselFixture(reduce = false) {
  const viewport = new Element();
  const container = { children: [1, 2, 3] };
  viewport.querySelector = () => container;
  const toggle = new Element();
  const previous = new Element();
  const next = new Element();
  const section = new Element();
  section.contains = () => false;
  section.querySelector = (selector) =>
    ({
      ".slide-viewport": viewport,
      "[data-slide-autoplay]": toggle,
      "[data-slide-prev]": previous,
      "[data-slide-next]": next,
    })[selector];
  const document = Object.assign(new EventTarget(), { hidden: false, querySelectorAll: () => [section] });
  const media = Object.assign(new EventTarget(), { matches: reduce });
  const handlers = new Map();
  let moves = 0;
  let playing = false;
  let destroyed = false;
  const carousel = {
    scrollSnapList: () => [0, 1, 2],
    canScrollPrev: () => true,
    canScrollNext: () => true,
    scrollPrev: () => moves--,
    scrollNext: () => moves++,
    on(name, handler) {
      handlers.set(name, handler);
      return this;
    },
    reInit() {},
    destroy() {
      destroyed = true;
    },
  };
  const autoplay = {
    play: () => {
      playing = true;
    },
    stop: () => {
      playing = false;
    },
    reset() {},
  };
  const { mountSlides } = loadTypeScript(
    "src/modules/slides.ts",
    {
      document,
      window: { matchMedia: () => media },
      HTMLElement: Element,
      performance: { now: () => 1000 },
      getComputedStyle: () => ({ direction: "ltr" }),
      IntersectionObserver: class {
        constructor(handler) {
          this.handler = handler;
        }
        observe() {
          this.handler([{ isIntersecting: true }]);
        }
        disconnect() {}
      },
    },
    { "embla-carousel": () => carousel, "embla-carousel-autoplay": () => autoplay },
  );
  const cleanup = mountSlides();
  const event = (type, properties = {}) => Object.assign(new Event(type, { cancelable: true }), properties);
  return {
    viewport,
    section,
    toggle,
    handlers,
    event,
    cleanup,
    moves: () => moves,
    playing: () => playing,
    destroyed: () => destroyed,
  };
}

test("manual pause survives pointer release and hover changes", () => {
  const fixture = carouselFixture();
  assert.equal(fixture.playing(), true);
  fixture.toggle.dispatchEvent(fixture.event("click"));
  fixture.handlers.get("pointerDown")();
  fixture.handlers.get("pointerUp")();
  fixture.section.dispatchEvent(fixture.event("mouseenter"));
  fixture.section.dispatchEvent(fixture.event("mouseleave"));
  assert.equal(fixture.playing(), false);
  assert.equal(fixture.toggle.attributes.get("aria-pressed"), "false");
  fixture.cleanup();
  assert.equal(fixture.destroyed(), true);
});

test("vertical scroll and pinch gestures keep their browser default", () => {
  const fixture = carouselFixture();
  const vertical = fixture.event("wheel", { deltaX: 0, deltaY: 80 });
  const pinch = fixture.event("wheel", { deltaX: 50, deltaY: 0, ctrlKey: true });
  fixture.viewport.dispatchEvent(vertical);
  fixture.viewport.dispatchEvent(pinch);
  assert.equal(vertical.defaultPrevented, false);
  assert.equal(pinch.defaultPrevented, false);
  assert.equal(fixture.moves(), 0);
  fixture.cleanup();
});

test("Shift wheel and arrow keys move the carousel and consume the event", () => {
  const fixture = carouselFixture();
  const wheel = fixture.event("wheel", { deltaX: 0, deltaY: 80, shiftKey: true });
  fixture.viewport.dispatchEvent(wheel);
  assert.equal(wheel.defaultPrevented, true);
  assert.equal(fixture.moves(), 1);
  const key = fixture.event("keydown", { key: "ArrowRight" });
  fixture.viewport.dispatchEvent(key);
  assert.equal(key.defaultPrevented, true);
  assert.equal(fixture.moves(), 2);
  fixture.cleanup();
});

test("reduced motion starts with autoplay paused", () => {
  const fixture = carouselFixture(true);
  assert.equal(fixture.playing(), false);
  assert.equal(fixture.toggle.attributes.get("aria-pressed"), "false");
  fixture.cleanup();
});
