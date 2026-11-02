import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadTypeScript } from "./support/load-typescript.mjs";

function createHarness(file, overrides = {}) {
  const calls = [];
  const errors = [];
  const events = new Map();
  const consoleMock = { error: (...args) => errors.push(args) };
  const { runInitializers } = loadTypeScript("src/utils/component-initializers.ts", { console: consoleMock });
  const dependencies = {};
  const source = ts.createSourceFile(
    file,
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
  );
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node)) continue;
    const path = node.moduleSpecifier.text;
    const exports = {};
    for (const binding of node.importClause?.namedBindings?.elements ?? []) {
      const name = binding.propertyName?.text ?? binding.name.text;
      exports[name] =
        name === "runInitializers"
          ? runInitializers
          : (...args) => {
              calls.push(name);
              return overrides[name]?.(...args);
            };
    }
    dependencies[path] = path === "alpinejs" ? { plugin() {}, start() {} } : exports;
  }
  const exports = loadTypeScript(
    file,
    {
      console: consoleMock,
      document: { readyState: "loading", addEventListener: (name, callback) => events.set(name, callback) },
      window: {
        themeConfig: { custom: { enable_swup: true } },
        addEventListener() {},
      },
    },
    dependencies,
  );
  return { calls, errors, runInitializers, exports, start: () => events.get("DOMContentLoaded")() };
}

test("initializers continue after a synchronous component failure", () => {
  const { runInitializers, calls, errors } = createHarness("src/swup/reinit/index.ts");
  const failure = new Error("optional enhancement failed");
  runInitializers({
    broken: () => {
      throw failure;
    },
    next: () => {
      calls.push("next");
    },
  });
  assert.deepEqual(calls, ["next"]);
  assert.equal(errors.length, 1);
  assert.match(errors[0][0], /broken/);
  assert.equal(errors[0][1], failure);
});

test("an asynchronous failure is handled without waiting to initialize other components", async () => {
  const { runInitializers, calls, errors } = createHarness("src/swup/reinit/index.ts");
  const failure = new Error("chunk unavailable");
  runInitializers({
    optional: () => Promise.reject(failure),
    next: () => {
      calls.push("next");
    },
  });
  assert.deepEqual(calls, ["next"]);
  await Promise.resolve();
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1], failure);
});

test("a reading enhancement failure does not disable equipment on the initial page", () => {
  const { calls, errors, start } = createHarness("src/main.ts", {
    initReading: () => {
      throw new SyntaxError("unsupported selector");
    },
  });
  assert.doesNotThrow(start);
  assert.ok(calls.includes("initEquipments"));
  assert.ok(calls.includes("initSlides"));
  assert.equal(errors.length, 1);
});

test("Swup still initializes drawers and equipment after a reading failure, including later visits", () => {
  const { calls, errors, exports } = createHarness("src/swup/reinit/index.ts", {
    initReading: () => {
      throw new SyntaxError("unsupported selector");
    },
  });
  assert.doesNotThrow(exports.reinitializeComponents);
  assert.doesNotThrow(exports.reinitializeComponents);
  assert.equal(calls.filter((name) => name === "initDrawers").length, 2);
  assert.equal(calls.filter((name) => name === "initEquipments").length, 2);
  assert.equal(errors.length, 2);
});

test("a third-party content widget failure does not disable drawers or equipment", () => {
  const { calls, errors, exports } = createHarness("src/swup/reinit/index.ts", {
    initContentWidgets: () => {
      throw new Error("plugin failed");
    },
  });
  assert.doesNotThrow(exports.reinitializeComponents);
  assert.ok(calls.includes("initDrawers"));
  assert.ok(calls.includes("initEquipments"));
  assert.equal(errors.length, 1);
});
