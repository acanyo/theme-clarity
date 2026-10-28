import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

export function loadTypeScript(file, globals = {}, dependencies = {}) {
  const filename = new URL(`../../${file}`, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(
    outputText,
    {
      exports,
      require(name) {
        if (!(name in dependencies)) throw new Error(`Unexpected test dependency: ${name}`);
        return dependencies[name];
      },
      URL,
      Event,
      AbortController,
      console,
      setTimeout,
      clearTimeout,
      queueMicrotask,
      ...globals,
    },
    { filename: filename.pathname },
  );
  return exports;
}
