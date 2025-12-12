import { Fancybox } from "@fancyapps/ui";

const fancyboxOptions = {
  Hash: false,
  Thumbs: { showOnStart: true },
  Toolbar: {
    display: {
      left: ["infobar"],
      middle: ["zoomIn", "zoomOut", "toggle1to1", "rotateCCW", "rotateCW", "flipX", "flipY"],
      right: ["slideshow", "thumbs", "close"],
    },
  },
};

const excludeClasses = ["logo", "avatar", "emoji", "icon", "no-lightbox"];

function shouldExclude(img: HTMLImageElement): boolean {
  return excludeClasses.some((cls) => img.classList.contains(cls));
}

export function initFancybox() {
  Fancybox.destroy();

  const selectors = [
    ".article img",
    ".moment-media img",
    ".moment-text img",
    ".comment-content img",
    ".link-info img",
    ".gallery-item img",
  ];

  const allImages: HTMLImageElement[] = [];

  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((img) => {
      const imgEl = img as HTMLImageElement;
      if (shouldExclude(imgEl)) return;
      if (!allImages.includes(imgEl)) {
        allImages.push(imgEl);
      }
    });
  });

  allImages.forEach((img) => {
    img.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const items = allImages.map((el) => ({
        src: el.getAttribute("src") || el.src,
        type: "image" as const,
      }));
      Fancybox.show(items, {
        ...fancyboxOptions,
        startIndex: allImages.indexOf(img),
      } as any);
    });
  });
}
