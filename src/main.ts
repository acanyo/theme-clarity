import "./styles/tailwind.css";
import "./styles/style.scss";
import Alpine from "alpinejs";
import collapse from "@alpinejs/collapse";
import Swup from "swup";
import SwupHeadPlugin from "@swup/head-plugin";
import SwupPreloadPlugin from "@swup/preload-plugin";
import SwupScrollPlugin from "@swup/scroll-plugin";
import SwupScriptsPlugin from "@swup/scripts-plugin";

import type { ThemeConfig } from "./types/config";

import { mountCounter } from "./preact";

/* Alpine.js 主题切换组件 */
Alpine.data("themeToggle", () => ({
  theme: localStorage.getItem("theme") || "system",

  init() {
    this.applyTheme(false);
    // 监听系统主题变化
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (this.theme === "system") {
        this.applyTheme(true);
      }
    });
  },

  // 通过事件获取点击位置
  setTheme(newTheme: string, event?: MouseEvent) {
    this.theme = newTheme;
    localStorage.setItem("theme", newTheme);
    this.applyTheme(true, event);
  },

  applyTheme(animate = true, event?: MouseEvent) {
    const html = document.documentElement;
    const isDark =
      this.theme === "dark" || (this.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    // 设置点击位置，用于圆形展开动画
    if (event) {
      html.style.setProperty("--x", event.clientX + "px");
      html.style.setProperty("--y", event.clientY + "px");
    }

    const updateDOM = () => {
      if (isDark) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    };

    // 使用 View Transitions API
    if (animate && document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  },
}));

/* Alpine.js 侧边栏控制组件 */
Alpine.data("sidebarControl", () => ({
  isOpen: false,

  toggle() {
    this.isOpen = !this.isOpen;
    const sidebar = document.getElementById("z-sidebar");
    const bgmask = document.getElementById("z-sidebar-bgmask");

    if (this.isOpen) {
      sidebar?.classList.add("show");
      bgmask?.classList.remove("hidden");
    } else {
      sidebar?.classList.remove("show");
      bgmask?.classList.add("hidden");
    }
  },

  close() {
    this.isOpen = false;
    document.getElementById("z-sidebar")?.classList.remove("show");
    document.getElementById("z-sidebar-bgmask")?.classList.add("hidden");
  },
}));

/* Alpine.js 分页组件 (DaisyUI) */
Alpine.data("pagination", (page: number, total: number) => ({
  page: Number(page) || 1,
  total: Number(total) || 1,
  pageArr: [] as (number | string)[],

  init() {
    console.log("Pagination init:", this.page, this.total);
    this.generatePageArr();
    console.log("Page array:", this.pageArr);
  },

  generatePageArr() {
    const delta = 2;
    const range: (number | string)[] = [];
    for (let i = 1; i <= this.total; i++) {
      if (i === 1 || i === this.total || (i >= this.page - delta && i <= this.page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "...") {
        range.push("...");
      }
    }
    this.pageArr = range;
  },

  getPageUrl(p: number | string): string {
    if (p === "...") return "javascript:void(0)";

    const path = window.location.pathname;
    const search = window.location.search;
    const params = new URLSearchParams(search);

    // 搜索页使用 query 参数
    if (params.has("keyword")) {
      params.set("page", String(p));
      return `${path}?${params.toString()}`;
    }

    // 标准 /page/N 路径
    let baseUrl = path.replace(/\/page\/\d+$/, "");
    if (baseUrl.length > 1 && baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (p === 1) {
      return baseUrl || "/";
    }
    // 避免 baseUrl 是 / 时生成 //page/N
    return baseUrl === "/" ? `/page/${p}` : `${baseUrl}/page/${p}`;
  },
}));

// 注册 Alpine.js 插件
Alpine.plugin(collapse);

window.Alpine = Alpine;
const swup = new Swup({
  plugins: [
    new SwupHeadPlugin({ persistAssets: true }),
    new SwupPreloadPlugin(),
    new SwupScrollPlugin(),
    new SwupScriptsPlugin({
      head: false,
      body: true,
    }),
  ],
  containers: ["#swup"],
});

Alpine.start();

function getThemeConfig(): ThemeConfig | undefined {
  const el = document.querySelector<HTMLScriptElement>("#theme-config");
  if (!el?.textContent) return undefined;

  try {
    return JSON.parse(el.textContent) as ThemeConfig;
  } catch (e) {
    console.error("解析 theme-config 失败:", e);
    return undefined;
  }
}

// 使用
const themeConfig = getThemeConfig();
console.log("主题配置：", themeConfig);

export function count(x: number, y: number) {
  return x + y;
}
function mountWidgets() {
  console.log("Mounting widgets...");
  const counterContainer = document.querySelector("#counter");
  if (counterContainer) {
    mountCounter(counterContainer as HTMLElement);
  }
}
swup.hooks.on("visit:start", () => {
  console.log(window.location.href);
});
swup.hooks.on("content:replace", () => {
  console.log("Content replaced");
  // mountWidgets();
});

// 页面初始加载
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");
  mountWidgets();
  initDropdownMenus();
});

// 初始化下拉菜单定位
function initDropdownMenus() {
  const hasSubmenuItems = document.querySelectorAll(".has-submenu");

  hasSubmenuItems.forEach((item) => {
    const trigger = item.querySelector(".has-dropdown");
    const dropdown = item.querySelector(".dropdown-menu") as HTMLElement;

    if (!trigger || !dropdown) return;

    const positionDropdown = () => {
      const rect = trigger.getBoundingClientRect();

      // 定位到触发器下方
      dropdown.style.top = `${rect.bottom + 4}px`;
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.minWidth = `${rect.width}px`;

      // 检查是否超出视口底部，如果超出则显示在上方
      const dropdownHeight = dropdown.offsetHeight;
      if (rect.bottom + dropdownHeight + 4 > window.innerHeight) {
        dropdown.style.top = `${rect.top - dropdownHeight - 4}px`;
      }
    };

    item.addEventListener("mouseenter", positionDropdown);
  });
}
