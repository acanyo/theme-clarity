import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./support/load-typescript.mjs";

function hooks() {
  const handlers = new Map();
  return {
    on(name, handler) {
      handlers.set(name, [...(handlers.get(name) ?? []), handler]);
    },
    replace(name, handler) {
      this[name] = handler;
    },
    fire(name, ...args) {
      for (const handler of handlers.get(name) ?? []) handler(...args);
    },
  };
}

function transitionFixture(sourceKey, targetKey, reducedMotion = false) {
  const attributes = new Map();
  const root = {
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
  };
  const source = {
    dataset: { articleKey: sourceKey },
    getBoundingClientRect: () => ({ width: 200, height: 100, top: 20, bottom: 120, left: 0, right: 200 }),
    setAttribute() {},
    removeAttribute() {},
  };
  const target = { ...source, dataset: { articleKey: targetKey } };
  let captures = 0;
  const incoming = { querySelector: () => target, querySelectorAll: () => [target] };
  const document = {
    documentElement: root,
    body: { classList: { remove() {} } },
    querySelector: () => null,
    querySelectorAll: () => [source],
    getElementById: () => null,
    startViewTransition(render) {
      captures++;
      const updateCallbackDone = Promise.resolve().then(render);
      return { updateCallbackDone, finished: updateCallbackDone, ready: Promise.resolve(), skipTransition() {} };
    },
  };
  const window = Object.assign(new EventTarget(), {
    location: { origin: "https://example.test" },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout,
  });
  const swup = { hooks: hooks() };
  const { registerArticleTransition } = loadTypeScript("src/swup/article-transition.ts", {
    window,
    document,
    innerHeight: 800,
    innerWidth: 1200,
    getComputedStyle: () => ({ visibility: "visible", borderRadius: "8px" }),
  });
  registerArticleTransition(swup);
  const visit = {
    animation: { animate: true },
    trigger: {},
    from: {},
    to: { document: incoming, html: "<html></html>" },
  };
  swup.hooks.fire("visit:start", visit);
  return { swup, visit, attributes, captures: () => captures };
}

test("different permalink paths with the same slug do not share a snapshot", async () => {
  const fixture = transitionFixture("/posts/same", "/archives/same");
  let renders = 0;
  await fixture.swup.hooks["visit:transition"](fixture.visit, {}, () => {
    renders++;
  });
  assert.equal(fixture.captures(), 0);
  assert.equal(renders, 1);
});

test("a matching permalink ignores navigation query parameters and cleans up", async () => {
  const fixture = transitionFixture("/archives/hello?from=category", "/archives/hello");
  let renders = 0;
  await fixture.swup.hooks["visit:transition"](fixture.visit, {}, () => {
    renders++;
  });
  assert.equal(fixture.captures(), 1);
  assert.equal(renders, 1);
  assert.equal(fixture.attributes.size, 0);
});

test("reduced motion skips shared snapshots", async () => {
  const fixture = transitionFixture("/archives/hello", "/archives/hello", true);
  assert.equal(fixture.visit.animation.animate, false);
  await fixture.swup.hooks["visit:transition"](fixture.visit, {}, () => {});
  assert.equal(fixture.captures(), 0);
});

test("history positions are restored by entry index when a URL repeats", () => {
  const window = {
    history: { state: { index: 1 } },
    scrollY: 450,
    scrollX: 0,
    scrollTo(position) {
      this.restored = position.top;
    },
  };
  const swup = { hooks: hooks() };
  loadTypeScript("src/swup/history-scroll.ts", { window }).registerHistoryScroll(swup);
  swup.hooks.fire("visit:start");
  window.history.state.index = 2;
  swup.hooks.fire("page:view");
  window.scrollY = 900;
  swup.hooks.fire("visit:start");
  window.history.state.index = 1;
  swup.hooks["content:scroll"]({ history: { popstate: true } }, {}, () => assert.fail("unexpected default scrolling"));
  assert.equal(window.restored, 450);
});
