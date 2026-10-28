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
import {
  initDropdownMenus,
  initBackToTop,
  initFloatingPagination,
  initActiveNavItem,
  initSearchShortcut,
  initAsideScrollSync,
  initPluginHints,
} from "./modules";

// 注册全局函数
window.mountPhotoGallery = mountPhotoGallery;
window.mountWeather = mountWeather;
window.generateQRCode = generateQRCode;
window.generatePoster = generatePoster;
window.generateMomentPoster = generateMomentPoster;
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
  if (window.themeConfig?.custom?.enable_swup) {
    try {
      initSwup();
    } catch (error) {
      console.error("Swup 初始化失败:", error);
    }
  }

  initDropdownMenus();
  if (window.themeConfig?.custom?.enable_fancybox !== true) {
    initFancybox();
  }
  initBackToTop();
  initImageLoaded();
  initImageCaption();
  initActiveNavItem();
  initActivityCalendar();
  void initTwikooComments();
  initFloatingPagination();
  initDrawers();
  initReading();
  void initSlides();
  initAsideScrollSync();
  initPluginHints();
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage, { once: true });
else initPage();

window.addEventListener("swup:success", () => {
  window.setTimeout(() => {
    initFloatingPagination();
    initAsideScrollSync();
    initPluginHints();
  }, 0);
});
