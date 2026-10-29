const storageKey = "clarity:equipment-view";

export function mountEquipmentView(root: HTMLElement, signal: AbortSignal) {
  const controls = root.querySelector<HTMLElement>("[data-equipment-views]");
  const buttons = root.querySelectorAll<HTMLButtonElement>("[data-equipment-view]");
  const update = (mode: string | null) => {
    const view = mode === "list" ? "list" : "shelf";
    root.dataset.view = view;
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.equipmentView === view)));
  };
  try {
    update(localStorage.getItem(storageKey));
  } catch {
    update(null);
  }
  if (controls) controls.hidden = false;
  buttons.forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const view = button.dataset.equipmentView ?? "shelf";
        update(view);
        try {
          localStorage.setItem(storageKey, view);
        } catch {
          /* Browsing still works without storage. */
        }
      },
      { signal },
    );
  });
}
