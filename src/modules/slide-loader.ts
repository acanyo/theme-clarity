let cleanup: (() => void) | undefined;
let generation = 0;

export function destroySlides() {
  generation++;
  cleanup?.();
  cleanup = undefined;
}

export async function initSlides() {
  destroySlides();
  if (!document.querySelector(".slide-viewport")) return;
  const current = generation;
  try {
    const { mountSlides } = await import("./slides");
    if (current === generation) cleanup = mountSlides();
  } catch (error) {
    // Native horizontal scrolling remains usable when the optional chunk fails to load.
    console.warn("轮播增强加载失败，保留原生滚动。", error);
  }
}
