import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./support/load-typescript.mjs";

function measure(targets, viewport = { height: 844, offsetTop: 0 }) {
  const properties = new Map();
  const anchor = {
    getBoundingClientRect: () => ({ left: 330, right: 370, top: 700, bottom: 812, width: 40, height: 112 }),
  };
  const panel = {
    style: { setProperty: (key, value) => properties.set(key, value), removeProperty: (key) => properties.delete(key) },
  };
  const window = new EventTarget();
  window.innerHeight = 844;
  window.visualViewport = Object.assign(new EventTarget(), viewport);
  const { mountPanelAvoidance } = loadTypeScript("src/modules/panel-avoidance.ts", {
    window,
    document: { querySelectorAll: () => targets.map((rect) => ({ getBoundingClientRect: () => rect })) },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  });
  const cleanup = mountPanelAvoidance(anchor, panel);
  return { shift: Number.parseFloat(properties.get("--panel-shift")), cleanup, properties };
}

test("panel clears a horizontally overlapping pagination control", () => {
  const result = measure([{ left: 100, right: 375, top: 740, bottom: 780, width: 275, height: 40 }]);
  assert.equal(result.shift, 88);
  result.cleanup();
  assert.equal(result.properties.size, 0);
});

test("panel stays in place when pagination is beside it", () => {
  assert.equal(measure([{ left: 10, right: 250, top: 740, bottom: 780, width: 240, height: 40 }]).shift, 0);
});

test("panel follows a reduced visual viewport without measuring its transformed position", () => {
  assert.equal(measure([], { height: 600, offsetTop: 0 }).shift, 228);
});
