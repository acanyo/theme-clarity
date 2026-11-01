import { closeDrawers } from "./drawers";

/**
 * 打开搜索组件
 * 移动端抽屉会盖住搜索弹窗，先收起再打开
 */
export const openSearchWidget = () => {
  closeDrawers(false);
  if (typeof SearchWidget !== "undefined") {
    SearchWidget.open();
  }
};

/**
 * 初始化搜索快捷键
 * 绑定 Ctrl+K / Cmd+K 快捷键打开搜索组件
 */
export const initSearchShortcut = () => {
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      openSearchWidget();
    }
  });
};
