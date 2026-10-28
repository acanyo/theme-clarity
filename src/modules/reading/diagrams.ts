import { readingButton } from "./controls";
import { renderDiagram } from "./mermaid-renderer";

const DIAGRAMS =
  ".article text-diagram[data-type='mermaid'], .article pre.mermaid, .article pre:has(> code.language-mermaid), .article pre:has(> code.lang-mermaid)";

export function mountDiagrams(root: ParentNode): () => void {
  const abort = new AbortController();
  const cleanups: Array<() => void> = [];
  const renderers = new Map<HTMLElement, () => void>();
  const isDark = () =>
    document.documentElement.classList.contains("dark") || document.documentElement.dataset.colorScheme === "dark";
  let disposed = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) renderers.get(entry.target as HTMLElement)?.();
      });
    },
    { rootMargin: "300px" },
  );
  const redraw = new MutationObserver(() => renderers.forEach((render) => render()));

  root.querySelectorAll<HTMLElement>(DIAGRAMS).forEach((original) => {
    // A plugin may already own a rendered graph. Keep that graph and its listeners intact.
    if (original.querySelector("svg") || original.closest("shiki-code, .reading-diagram, [data-no-reading-enhance]"))
      return;
    const source = original.textContent ?? "";
    if (!source.trim()) return;
    const figure = document.createElement("figure");
    figure.className = "reading-diagram";
    const toolbar = document.createElement("figcaption");
    toolbar.className = "reading-toolbar";
    const label = document.createElement("span");
    label.className = "reading-label";
    label.textContent = "Mermaid";
    const fit = readingButton("原始尺寸");
    fit.setAttribute("aria-pressed", "false");
    const retry = readingButton("重试");
    retry.hidden = true;
    toolbar.append(label, fit, retry);
    const viewport = document.createElement("div");
    viewport.className = "reading-diagram-scroll";
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "region");
    viewport.setAttribute("aria-label", "Mermaid 图表，可滚动");
    const status = document.createElement("p");
    status.className = "reading-diagram-status";
    status.setAttribute("role", "status");
    status.textContent = "图表将在接近阅读位置时加载。";
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "查看源码";
    const code = document.createElement("pre");
    code.textContent = source;
    details.append(summary, code);
    figure.append(toolbar, status, viewport, details);
    original.replaceWith(figure);
    // Remove the original from document queries while preserving it for cleanup.
    const preserved = document.createElement("template");
    preserved.content.append(original);

    let renderedTheme: boolean | undefined;
    let renderingTheme: boolean | undefined;
    let generation = 0;
    const render = async (force = false) => {
      const bounds = figure.getBoundingClientRect();
      if (bounds.top > innerHeight + 300 || bounds.bottom < -300) return;
      const dark = isDark();
      if (!force && (renderedTheme === dark || renderingTheme === dark)) return;
      const current = ++generation;
      renderingTheme = dark;
      retry.hidden = true;
      status.hidden = false;
      status.textContent = "图表加载中…";
      viewport.setAttribute("aria-busy", "true");
      try {
        const svg = await renderDiagram(source, dark, viewport);
        if (disposed || current !== generation) return;
        viewport.innerHTML = svg;
        const width = viewport.querySelector("svg")?.viewBox.baseVal.width;
        if (width) figure.style.setProperty("--diagram-width", `${width}px`);
        renderedTheme = dark;
        status.hidden = true;
      } catch {
        if (disposed || current !== generation) return;
        viewport.replaceChildren();
        status.textContent = "图表暂时无法显示，已保留源码。";
        retry.hidden = false;
        details.open = true;
      } finally {
        if (current === generation) {
          renderingTheme = undefined;
          viewport.removeAttribute("aria-busy");
        }
      }
    };

    fit.addEventListener(
      "click",
      () => {
        const natural = figure.classList.toggle("is-natural");
        fit.setAttribute("aria-pressed", String(natural));
        fit.textContent = natural ? "适应宽度" : "原始尺寸";
      },
      { signal: abort.signal },
    );
    retry.addEventListener("click", () => void render(true), { signal: abort.signal });
    renderers.set(figure, () => void render());
    observer.observe(figure);
    cleanups.push(() => figure.replaceWith(original));
  });
  if (renderers.size)
    redraw.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-color-scheme"] });

  return () => {
    disposed = true;
    abort.abort();
    observer.disconnect();
    redraw.disconnect();
    cleanups.forEach((cleanup) => cleanup());
  };
}
