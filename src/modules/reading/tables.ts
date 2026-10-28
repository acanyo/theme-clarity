import { readingButton } from "./controls";

/** Scroll the original table so captions, headers and editor markup retain their semantics. */
export function mountTables(root: ParentNode): () => void {
  const abort = new AbortController();
  const cleanups: Array<() => void> = [];

  root.querySelectorAll<HTMLTableElement>(".article table").forEach((table, index) => {
    if (table.closest(".reading-table, [data-no-reading-enhance]")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "reading-table";
    const toolbar = document.createElement("div");
    toolbar.className = "reading-toolbar";
    const label = document.createElement("span");
    label.className = "reading-label";
    label.textContent = table.caption?.textContent || "表格";
    const toggle = readingButton("自动换行");
    toggle.setAttribute("aria-pressed", "false");
    const viewport = document.createElement("div");
    viewport.id = `reading-table-${index}`;
    viewport.className = "reading-table-scroll";
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "region");
    viewport.setAttribute("aria-label", `${label.textContent}，可滚动`);
    toggle.setAttribute("aria-controls", viewport.id);
    toolbar.append(label, toggle);
    table.before(wrapper);
    viewport.append(table);
    wrapper.append(toolbar, viewport);

    toggle.addEventListener(
      "click",
      () => {
        const wrapped = wrapper.classList.toggle("is-wrapped");
        toggle.setAttribute("aria-pressed", String(wrapped));
        toggle.textContent = wrapped ? "横向滚动" : "自动换行";
      },
      { signal: abort.signal },
    );
    cleanups.push(() => wrapper.replaceWith(table));
  });

  return () => {
    abort.abort();
    cleanups.forEach((cleanup) => cleanup());
  };
}
