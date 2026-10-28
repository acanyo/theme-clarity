import type { Mermaid } from "mermaid";

let engine: Promise<Mermaid> | undefined;
let queue: Promise<unknown> = Promise.resolve();
let sequence = 0;

function loadMermaid(): Promise<Mermaid> {
  const supplied = (window as Window & { mermaid?: Mermaid }).mermaid;
  if (supplied?.render) return Promise.resolve(supplied);
  engine ??= import("mermaid")
    .then((module) => module.default)
    .catch((error) => {
      engine = undefined;
      throw error;
    });
  return engine;
}

/** Mermaid configuration is global; serialize rendering so theme changes cannot race. */
export function renderDiagram(source: string, dark: boolean, container: HTMLElement): Promise<string> {
  const rendered = queue
    .catch(() => {})
    .then(async () => {
      const mermaid = await loadMermaid();
      await document.fonts.ready;
      if (!container.isConnected) return "";
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        securityLevel: "strict",
        suppressErrorRendering: true,
        fontFamily: getComputedStyle(container).fontFamily,
      });
      const result = await mermaid.render(`clarity-diagram-${++sequence}`, source, container);
      return result.svg;
    });
  queue = rendered;
  return rendered;
}
