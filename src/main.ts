import "./styles/tailwind.css";
import "./styles/style.scss";
import "@chinese-fonts/kksjt/dist/kuaikanshijieti20231213/result.css";

import Alpine from "alpinejs";
import collapse from "@alpinejs/collapse";

import { mountPhotoGallery, mountWeather } from "./preact";
import { initFancybox } from "./utils/fancybox";
import { generateQRCode, generatePoster } from "./utils/poster";
import { generateMomentPoster } from "./utils/moment-poster";
import { initActivityCalendar } from "./utils/activity-calendar";
import { initTwikooComments } from "./utils/twikoo";
import { registerAlpineComponents } from "./alpine";
import { initSwup } from "./swup/swup";
import { reinitializeComponents } from "./swup/reinit";
import { initImageLoaded, initImageCaption } from "./utils/image";
import { initSlides } from "./modules/slide-loader";
import { initDrawers } from "./modules/drawers";
import { initReading } from "./modules/reading";
import { initEquipments } from "./modules/equipments";
import { runInitializers } from "./utils/component-initializers";
import {
  initDropdownMenus,
  initBackToTop,
  initFloatingPagination,
  initActiveNavItem,
  initSearchShortcut,
  openSearchWidget,
  initAsideScrollSync,
  initPluginHints,
} from "./modules";

// 注册全局函数
window.mountPhotoGallery = mountPhotoGallery;
window.mountWeather = mountWeather;
window.generateQRCode = generateQRCode;
window.generatePoster = generatePoster;
window.generateMomentPoster = generateMomentPoster;
window.openSearchWidget = openSearchWidget;
window.reinitializeComponents = reinitializeComponents;

// 注册 Alpine.js 组件和插件
registerAlpineComponents(Alpine);
Alpine.plugin(collapse);

window.Alpine = Alpine;
Alpine.start();

// 初始化搜索快捷键
initSearchShortcut();

// 页面初始加载；缓存恢复或开发入口可能在 DOMContentLoaded 后执行。
const initPage = () => {
  runInitializers({
    initSwup: () => {
      if (window.themeConfig?.custom?.enable_swup) initSwup();
    },
    initDropdownMenus,
    initFancybox: () => (window.themeConfig?.custom?.enable_fancybox !== true ? initFancybox() : undefined),
    initBackToTop,
    initImageLoaded,
    initImageCaption,
    initActiveNavItem,
    initActivityCalendar,
    initTwikooComments,
    initFloatingPagination,
    initDrawers,
    initReading,
    initEquipments,
    initSlides,
    initAsideScrollSync,
    initPluginHints,
  });
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage, { once: true });
else initPage();

window.addEventListener("swup:success", () => {
  window.setTimeout(() => {
    runInitializers({ initFloatingPagination, initAsideScrollSync, initPluginHints });
  }, 0);
});
