import { mountEquipmentDialog } from "./dialog";
import { mountEquipmentView } from "./view";

let cleanup: (() => void) | undefined;
export function initEquipments() {
  cleanup?.();
  cleanup = undefined;
  const root = document.querySelector<HTMLElement>("[data-equipment-page]");
  if (!root) return;
  const controller = new AbortController();
  mountEquipmentView(root, controller.signal);
  const closeDialog = mountEquipmentDialog(root, controller.signal);
  root.querySelectorAll<HTMLImageElement>(".equipment-media img").forEach((image) => {
    const fallback = () => image.parentElement?.classList.add("is-empty");
    image.addEventListener("error", fallback, { signal: controller.signal });
    if (image.complete && image.naturalWidth === 0) fallback();
  });
  cleanup = () => {
    closeDialog();
    controller.abort();
  };
}
