import { readingButton } from "./controls";

/** Keep the editor's code DOM intact, including server-rendered highlighting. */
export function mountCodeBlocks(root: ParentNode): () => void {
  const abort = new AbortController();
  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();

  root.querySelectorAll<HTMLElement>(".article pre").forEach((pre, index) => {
    if (pre.closest("shiki-code, text-diagram, .reading-code, .reading-diagram, [data-no-reading-enhance]")) return;
    if (pre.matches(".mermaid") || pre.querySelector("code.language-mermaid, code.lang-mermaid")) return;

    const code = pre.querySelector("code") ?? pre;
    const source = code.textContent ?? "";
    if (!source.trim()) return;
    const rows = source.replace(/\n$/, "").split("\n").length;
    const language = pre.dataset.language ?? /(?:language|lang)-([\w+-]+)/.exec(code.className)?.[1] ?? "代码";
    const filename = pre.dataset.filename ?? code.dataset.filename;
    const figure = document.createElement("figure");
    figure.className = "reading-code";
    const toolbar = document.createElement("figcaption");
    toolbar.className = "reading-toolbar";
    const label = document.createElement("span");
    label.className = "reading-label";
    label.textContent = filename ? `${filename} · ${language}` : language;
    const wrap = readingButton("自动换行");
    wrap.setAttribute("aria-pressed", "false");
    const copy = readingButton("复制代码");
    const status = document.createElement("span");
    status.className = "reading-status";
    status.setAttribute("role", "status");
    toolbar.append(label, wrap, copy, status);

    const viewport = document.createElement("div");
    viewport.className = "reading-code-scroll";
    viewport.id = `reading-code-${index}`;
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "region");
    viewport.setAttribute("aria-label", filename ? `${filename} 代码内容` : `${language}代码内容`);
    const content = document.createElement("div");
    content.className = "reading-code-content";
    const numbers = document.createElement("span");
    numbers.className = "reading-line-numbers";
    numbers.setAttribute("aria-hidden", "true");
    numbers.textContent = Array.from({ length: rows }, (_, line) => String(line + 1)).join("\n");

    pre.before(figure);
    content.append(numbers, pre);
    viewport.append(content);
    figure.append(toolbar, viewport);

    wrap.addEventListener(
      "click",
      () => {
        const wrapped = figure.classList.toggle("is-wrapped");
        wrap.setAttribute("aria-pressed", String(wrapped));
        wrap.textContent = wrapped ? "横向滚动" : "自动换行";
      },
      { signal: abort.signal },
    );
    copy.addEventListener(
      "click",
      async () => {
        try {
          await navigator.clipboard.writeText(source);
          if (abort.signal.aborted) return;
          copy.textContent = "已复制";
          status.textContent = "代码已复制";
          const timer = window.setTimeout(() => {
            copy.textContent = "复制代码";
            status.textContent = "";
            timers.delete(timer);
          }, 2000);
          timers.add(timer);
        } catch {
          if (!abort.signal.aborted) status.textContent = "复制失败，请选择代码后复制。";
        }
      },
      { signal: abort.signal },
    );

    if (rows > 20) {
      figure.classList.add("is-collapsed");
      const collapse = readingButton(`展开代码（${rows} 行）`);
      collapse.classList.add("reading-code-expand");
      collapse.setAttribute("aria-controls", viewport.id);
      collapse.setAttribute("aria-expanded", "false");
      collapse.addEventListener(
        "click",
        () => {
          const collapsed = figure.classList.toggle("is-collapsed");
          collapse.setAttribute("aria-expanded", String(!collapsed));
          collapse.textContent = collapsed ? `展开代码（${rows} 行）` : "收起代码";
        },
        { signal: abort.signal },
      );
      figure.append(collapse);
    }

    cleanups.push(() => figure.replaceWith(pre));
  });

  return () => {
    abort.abort();
    timers.forEach(clearTimeout);
    cleanups.forEach((cleanup) => cleanup());
  };
}
