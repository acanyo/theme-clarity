import "./styles/tailwind.css";
import "./styles/style.scss";
import "@chinese-fonts/kksjt/dist/kuaikanshijieti20231213/result.css";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

import { Fancybox } from "@fancyapps/ui";
import Alpine from "alpinejs";
import collapse from "@alpinejs/collapse";

import { mountPhotoGallery, mountWeather } from "./preact";
import { initFancybox } from "./utils/fancybox";
import { initLinkSubmit } from "./links-submit";
import { generateQRCode, generatePoster } from "./utils/poster";
import { registerAlpineComponents } from "./alpine";

// 注册全局函数
window.Fancybox = Fancybox;
window.mountPhotoGallery = mountPhotoGallery;
window.mountWeather = mountWeather;
window.generateQRCode = generateQRCode;
window.generatePoster = generatePoster;

// 注册 Alpine.js 组件和插件
registerAlpineComponents(Alpine);
Alpine.plugin(collapse);

window.Alpine = Alpine;
Alpine.start();

// 搜索快捷键 Ctrl+K / Cmd+K
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    if (typeof SearchWidget !== "undefined") {
      SearchWidget.open();
    }
  }
});

// 页面初始加载
document.addEventListener("DOMContentLoaded", () => {
  initDropdownMenus();
  initFancybox();
  initBackToTop();
  initLinkSubmit();
  initImageLoaded();
  initImageCaption();
  initActiveNavItem();
});

// 侧边栏菜单激活状态
function initActiveNavItem() {
  // 检查是否启用
  if (document.documentElement.dataset.navActive === "false") return;

  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll(".sidebar-nav-item, .dropdown-item");

  navItems.forEach((item) => {
    const link = item as HTMLAnchorElement;
    const href = link.getAttribute("href");
    if (!href || href === "#") return;

    // 精确匹配或路径前缀匹配
    const isActive =
      currentPath === href ||
      (href !== "/" && currentPath.startsWith(href)) ||
      (href === "/" && currentPath === "/");

    if (isActive) {
      link.classList.add("active");
      // 如果是子菜单项，展开父菜单
      const parentSubmenu = link.closest(".has-submenu");
      if (parentSubmenu) {
        parentSubmenu.classList.add("expanded");
      }
    }
  });
}

function initImageLoaded() {
  document.querySelectorAll("img").forEach((img) => {
    if (img.complete) {
      img.classList.add("loaded");
    } else {
      img.addEventListener("load", () => img.classList.add("loaded"));
      img.addEventListener("error", () => img.classList.add("loaded"));
    }
  });
}

function initImageCaption() {
  if (!window.themeConfig?.custom?.img_alt) return;

  const article = document.querySelector(".article");
  if (!article) return;

  const images = article.querySelectorAll("img");
  if (!images.length) return;

  images.forEach((img) => {
    const alt = img.alt?.trim();
    if (!alt) return;

    if (img.closest(".c-pic, [data-type='gallery']")) return;

    const figure = img.closest("figure");
    if (figure?.querySelector("figcaption")) return;

    const caption = document.createElement("figcaption");
    caption.textContent = alt;

    if (figure) {
      figure.classList.add("img-caption");
      figure.appendChild(caption);
    } else {
      const wrapper = document.createElement("figure");
      wrapper.className = "img-caption";
      img.parentNode?.insertBefore(wrapper, img);
      wrapper.append(img, caption);
    }
  });
}

function initDropdownMenus() {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest(".has-dropdown");

    if (trigger) {
      const parent = trigger.closest(".has-submenu");
      if (parent) {
        const arrow = trigger.querySelector(".dropdown-arrow");
        const navText = trigger.querySelector(".nav-text");

        if (target === arrow || target === trigger || !navText?.contains(target)) {
          e.preventDefault();
          parent.classList.toggle("expanded");
        }
      }
    }
  });
}

function initBackToTop() {
  const mobileBtn = document.getElementById("back-to-top") as HTMLButtonElement | null;
  const pcBtn = document.getElementById("pc-back-to-top") as HTMLButtonElement | null;

  if (!mobileBtn && !pcBtn) return;

  if ((mobileBtn as HTMLButtonElement & { _inited?: boolean })?._inited) return;
  if (mobileBtn) (mobileBtn as HTMLButtonElement & { _inited?: boolean })._inited = true;

  const updateVisibility = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const showMobile = y > 300;

    if (mobileBtn) mobileBtn.style.display = showMobile ? "" : "none";

    if (pcBtn) {
      if (showMobile) {
        pcBtn.classList.add("show");
      } else {
        pcBtn.classList.remove("show");
      }
    }
  };

  updateVisibility();
  window.addEventListener("scroll", updateVisibility, { passive: true });

  if (mobileBtn) {
    let pressTimer: number | null = null;
    let longPressed = false;
    const pressDuration = 600;

    const onPointerDown = () => {
      longPressed = false;
      pressTimer = window.setTimeout(() => {
        longPressed = true;
        if (history.length > 1) {
          history.back();
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, pressDuration);
    };

    const clearTimer = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    mobileBtn.addEventListener("mousedown", onPointerDown);
    mobileBtn.addEventListener("touchstart", onPointerDown);
    mobileBtn.addEventListener("mouseup", clearTimer);
    mobileBtn.addEventListener("mouseleave", clearTimer);
    mobileBtn.addEventListener("touchend", clearTimer);

    mobileBtn.addEventListener("click", () => {
      if (!longPressed) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
}
