import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./support/load-typescript.mjs";

function diagrams() {
  let disconnected = 0;
  class Observer {
    observe() {}
    disconnect() {
      disconnected++;
    }
  }
  const { mountDiagrams } = loadTypeScript(
    "src/modules/reading/diagrams.ts",
    {
      document: { documentElement: { classList: { contains: () => false }, dataset: {} } },
      IntersectionObserver: Observer,
      MutationObserver: Observer,
    },
    { "./controls": {}, "./mermaid-renderer": {} },
  );
  return { mountDiagrams, disconnected: () => disconnected };
}

test("diagram discovery works when the selector engine does not support :has()", () => {
  const { mountDiagrams, disconnected } = diagrams();
  const root = {
    querySelectorAll(selector) {
      if (selector.includes(":has(")) throw new SyntaxError("unsupported selector");
      return [];
    },
  };
  const cleanup = mountDiagrams(root);
  cleanup();
  assert.equal(disconnected(), 2);
});

test("a pre and its Mermaid code child are inspected once and preserve plugin-owned SVG", () => {
  const { mountDiagrams } = diagrams();
  let inspections = 0;
  const pre = {
    matches: () => false,
    querySelector(selector) {
      assert.equal(selector, "svg");
      inspections++;
      return {};
    },
  };
  const code = { matches: (selector) => selector === "code", parentElement: pre };
  const cleanup = mountDiagrams({ querySelectorAll: () => [pre, code] });
  assert.equal(inspections, 1);
  cleanup();
});
