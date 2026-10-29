import { mountCustomElements } from "../../preact";
import { initFancybox } from "../../utils/fancybox";
import { initLinkSubmit } from "../../modules/links-submit";
import { reinitializeAlpineComponents } from "./alpine";
import { initImageLoaded, initImageCaption } from "./image";
import { initActiveNavItem, initDropdownMenus } from "./navigation";
import { initBackToTop } from "./back-to-top";
import { momentsTags } from "./moments-tags";
import { initReading } from "../../modules/reading";
import { syncThemeConfig } from "./theme-config";
import { initTwikooComments } from "../../utils/twikoo";
import { initActivityCalendar } from "../../utils/activity-calendar";
import { initAsideScrollSync } from "../../modules/aside-scroll-sync";
import { initContentWidgets } from "./content-widgets";
import { initSlides } from "../../modules/slide-loader";
import { initDrawers } from "../../modules/drawers";
import { initEquipments } from "../../modules/equipments";

export { syncThemeConfig } from "./theme-config";
export { reinitializeAlpineComponents } from "./alpine";
export { initImageLoaded, initImageCaption } from "./image";
export { initActiveNavItem, initDropdownMenus } from "./navigation";
export { initBackToTop } from "./back-to-top";
export { momentsTags } from "./moments-tags";
export { initContentWidgets } from "./content-widgets";

/**
 * 重新初始化页面组件
 * 在 Swup 页面切换后调用此函数来重新初始化各种 UI 组件和功能
 * 包括Alpine.js组件、图片加载状态、图片说明文字、返回顶部按钮、下拉菜单
 * 活动导航项、链接提交、Fancybox（如果启用）、自定义元素、时间标签、主题配置和Mermaid图表
 */
export const reinitializeComponents = () => {
  reinitializeAlpineComponents();
  initImageLoaded();
  initImageCaption();
  initBackToTop();
  initDropdownMenus();
  initActiveNavItem();
  initLinkSubmit();
  if (window.themeConfig?.custom?.enable_fancybox !== true) {
    initFancybox();
  }
  mountCustomElements();
  momentsTags();
  initActivityCalendar();
  syncThemeConfig();
  initReading();
  void initTwikooComments();
  initAsideScrollSync();
  initContentWidgets();
  initDrawers();
  initEquipments();
  void initSlides();
};
