import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./support/load-typescript.mjs";

function renderer(engine) {
  return loadTypeScript("src/modules/reading/mermaid-renderer.ts", {
    window: { mermaid: engine },
    document: { fonts: { ready: Promise.resolve() } },
    getComputedStyle: () => ({ fontFamily: "sans-serif" }),
  }).renderDiagram;
}

test("diagram rendering serializes global theme configuration", async () => {
  let theme;
  const calls = [];
  const render = renderer({
    initialize(options) {
      theme = options.theme;
    },
    async render(_id, source) {
      const before = theme;
      await Promise.resolve();
      assert.equal(theme, before);
      calls.push([source, theme]);
      return { svg: `<svg>${source}</svg>` };
    },
  });
  const container = { isConnected: true };
  await Promise.all([render("first", false, container), render("second", true, container)]);
  assert.deepEqual(calls, [
    ["first", "default"],
    ["second", "dark"],
  ]);
});

test("an invalid diagram does not block the next diagram", async () => {
  const render = renderer({
    initialize() {},
    async render(_id, source) {
      if (source === "invalid") throw new Error("Invalid diagram");
      return { svg: "<svg />" };
    },
  });
  await assert.rejects(render("invalid", false, { isConnected: true }), /Invalid diagram/);
  assert.equal(await render("valid", false, { isConnected: true }), "<svg />");
});

test("a diagram removed during navigation is not rendered", async () => {
  const render = renderer({
    initialize() {
      assert.fail("should not configure a disconnected diagram");
    },
    render() {
      assert.fail("should not render a disconnected diagram");
    },
  });
  assert.equal(await render("valid", false, { isConnected: false }), "");
});
