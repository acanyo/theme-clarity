const text = (item: HTMLElement, selector: string) => item.querySelector(selector)?.textContent?.trim() ?? "";

function relatedUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, location.href);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function mountEquipmentDialog(root: HTMLElement, signal: AbortSignal): () => void {
  const dialog = root.querySelector<HTMLDialogElement>(".equipment-dialog");
  const items = Array.from(root.querySelectorAll<HTMLElement>("[data-equipment-item]"));
  if (!dialog || !items.length) return () => {};
  const title = dialog.querySelector<HTMLElement>("[data-equipment-dialog-title]")!;
  const group = dialog.querySelector<HTMLElement>("[data-equipment-dialog-group]")!;
  const specification = dialog.querySelector<HTMLElement>("[data-equipment-dialog-spec]")!;
  const description = dialog.querySelector<HTMLElement>("[data-equipment-dialog-description]")!;
  const media = dialog.querySelector<HTMLElement>("[data-equipment-dialog-media]")!;
  const cover = dialog.querySelector<HTMLImageElement>("[data-equipment-dialog-cover]")!;
  const link = dialog.querySelector<HTMLAnchorElement>("[data-equipment-dialog-link]")!;
  const position = dialog.querySelector<HTMLElement>("[data-equipment-position]")!;
  const previous = dialog.querySelector<HTMLButtonElement>("[data-equipment-prev]")!;
  const next = dialog.querySelector<HTMLButtonElement>("[data-equipment-next]")!;
  const shareLabel = dialog.querySelector<HTMLElement>("[data-equipment-share-label]")!;
  const status = dialog.querySelector<HTMLElement>("[data-equipment-status]")!;
  let index = 0;
  let returnFocus: HTMLElement | null = null;
  let savedOverflow = "";
  const render = (target: number) => {
    if (target < 0 || target >= items.length) return;
    index = target;
    const item = items[index];
    title.textContent = text(item, ".equipment-name");
    group.textContent = text(item, ".equipment-category") || "装备详情";
    specification.textContent = text(item, ".equipment-spec");
    specification.hidden = !specification.textContent;
    description.textContent = text(item, ".equipment-description");
    description.hidden = !description.textContent;
    const source = item.dataset.cover?.trim();
    cover.hidden = !source;
    media.classList.toggle("is-empty", !source);
    if (source) {
      cover.src = source;
      cover.alt = title.textContent;
    } else {
      cover.removeAttribute("src");
      cover.alt = "";
    }
    const url = relatedUrl(item.dataset.url);
    link.hidden = !url;
    if (url) link.href = url;
    else link.removeAttribute("href");
    position.textContent = `${index + 1} / ${items.length}`;
    previous.disabled = index === 0;
    next.disabled = index === items.length - 1;
    if (previous.disabled && document.activeElement === previous) next.focus();
    if (next.disabled && document.activeElement === next) previous.focus();
    shareLabel.textContent = "复制装备链接";
    status.textContent = "";
    dialog.scrollTop = 0;
  };
  const open = (target: number) => {
    render(target);
    if (dialog.open) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    savedOverflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
  };
  const close = () => dialog.close();
  const restore = () => {
    document.documentElement.style.overflow = savedOverflow;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
  root.querySelectorAll<HTMLButtonElement>("[data-equipment-open]").forEach((button, itemIndex) => {
    button.addEventListener("click", () => open(itemIndex), { signal });
  });
  dialog.querySelector("[data-equipment-close]")!.addEventListener("click", close, { signal });
  dialog.addEventListener("close", restore, { signal });
  dialog.addEventListener(
    "click",
    (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        close();
    },
    { signal },
  );
  previous.addEventListener("click", () => render(index - 1), { signal });
  next.addEventListener("click", () => render(index + 1), { signal });
  dialog.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      render(index + (event.key === "ArrowRight" ? 1 : -1));
    },
    { signal },
  );
  cover.addEventListener(
    "error",
    () => {
      media.classList.add("is-empty");
      cover.hidden = true;
    },
    { signal },
  );
  dialog.querySelector("[data-equipment-share]")!.addEventListener(
    "click",
    async () => {
      const url = new URL(location.href);
      url.hash = `equipment=${encodeURIComponent(items[index].dataset.equipmentId ?? "")}`;
      try {
        await navigator.clipboard.writeText(url.href);
        if (signal.aborted) return;
        shareLabel.textContent = "已复制";
        status.textContent = "装备链接已复制";
      } catch {
        if (!signal.aborted) status.textContent = "复制失败，请复制浏览器中的页面地址。";
      }
    },
    { signal },
  );
  const openShared = () => {
    if (!location.hash.startsWith("#equipment=")) return;
    try {
      const id = decodeURIComponent(location.hash.slice("#equipment=".length));
      const target = items.findIndex((item) => item.dataset.equipmentId === id);
      if (target >= 0) open(target);
    } catch {
      /* Malformed links must not interrupt browsing. */
    }
  };
  window.addEventListener("hashchange", openShared, { signal });
  openShared();
  return () => {
    if (dialog.open) {
      close();
      restore();
    }
  };
}
