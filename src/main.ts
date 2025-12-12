import "./styles/tailwind.css";
import "./styles/style.scss";
import "@chinese-fonts/kksjt/dist/kuaikanshijieti20231213/result.css";
// Fancybox CSS - 静态导入确保在 JS 执行前加载
import "@fancyapps/ui/dist/fancybox/fancybox.css";

import { Fancybox } from "@fancyapps/ui";
import Alpine from "alpinejs";
// @ts-ignore
import collapse from "@alpinejs/collapse";
import html2canvas from "html2canvas";
import QRCode from "qrcode";

import { mountPhotoGallery, mountWeather } from "./preact";
import { initFancybox } from "./utils/fancybox";
import { initLinkSubmit } from "./links-submit";
(window as any).Fancybox = Fancybox;
(window as any).mountPhotoGallery = mountPhotoGallery;
(window as any).mountWeather = mountWeather;

// 海报生成函数
(window as any).generateQRCode = async (container: HTMLElement, url: string) => {
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 160, margin: 1 });
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "QR Code";
    container.innerHTML = "";
    container.appendChild(img);
  } catch (err) {
    console.error("二维码生成失败:", err);
  }
};

(window as any).generatePoster = async (element: HTMLElement, title: string) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#fff",
  });
  const link = document.createElement("a");
  link.download = `${title || "海报"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

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

/* Alpine.js 用户登录组件 */
Alpine.data("userAuth", () => ({
  currentUser: null as { name: string; avatar?: string; isAdmin: boolean } | null,
  showMenu: false,
  ready: false,

  init() {
    this.checkLoginStatus();
  },

  async checkLoginStatus() {
    try {
      const res = await fetch("/apis/api.console.halo.run/v1alpha1/users/-");
      if (res.ok) {
        const data = await res.json();
        const userName = data.user?.metadata?.name;
        if (userName && userName !== "anonymousUser") {
          // 检查用户角色，判断是否为管理员
          const roles = data.user?.metadata?.annotations?.["rbac.authorization.halo.run/role-names"] || "";
          const isAdmin = roles.includes("super-role") || roles.includes("admin") || userName === "admin";

          this.currentUser = {
            name: data.user?.spec?.displayName || userName,
            avatar: data.user?.spec?.avatar,
            isAdmin,
          };
        } else {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
      }
    } catch {
      this.currentUser = null;
    } finally {
      this.ready = true;
    }
  },

  toggleMenu() {
    this.showMenu = !this.showMenu;
  },

  handleClick() {
    if (this.currentUser?.isAdmin) {
      this.toggleMenu();
    } else {
      window.location.href = "/uc";
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

/* Alpine.js 文章点赞组件 */
Alpine.data("postLike", () => ({
  count: 0,
  liked: false,
  loading: false,
  postName: "",

  init() {
    // 从当前元素获取数据
    const el = this.$el as HTMLElement;
    this.postName = el.dataset.name || "";
    this.count = parseInt(el.dataset.count || "0", 10);

    // 检查本地存储的点赞状态
    if (this.postName) {
      const likedPosts = JSON.parse(localStorage.getItem("liked_posts") || "{}");
      this.liked = !!likedPosts[this.postName];
    }
  },

  async toggleLike() {
    if (this.loading || !this.postName || this.liked) return;

    this.loading = true;
    try {
      const res = await fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group: "content.halo.run",
          plural: "posts",
          name: this.postName,
        }),
      });

      if (res.ok) {
        const likedPosts = JSON.parse(localStorage.getItem("liked_posts") || "{}");
        likedPosts[this.postName] = true;
        localStorage.setItem("liked_posts", JSON.stringify(likedPosts));
        this.liked = true;
        this.count++;
      }
    } catch (err) {
      console.error("点赞失败:", err);
    } finally {
      this.loading = false;
    }
  },
}));

/* Alpine.js 分页组件 (DaisyUI) */
Alpine.data("pagination", (page: number, total: number) => ({
  page: Number(page) || 1,
  total: Number(total) || 1,
  pageArr: [] as (number | string)[],

  init() {
    this.generatePageArr();
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

Alpine.start();

// 搜索快捷键 Ctrl+K / Cmd+K
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    // @ts-ignore - SearchWidget 由 Halo 搜索插件提供
    if (typeof SearchWidget !== "undefined") {
      // @ts-ignore
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
});

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

// 初始化下拉菜单交互
function initDropdownMenus() {
  // 使用事件委托处理点击事件
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest(".has-dropdown");

    if (trigger) {
      const parent = trigger.closest(".has-submenu");
      if (parent) {
        const arrow = trigger.querySelector(".dropdown-arrow");
        const navText = trigger.querySelector(".nav-text");

        // 只有点击箭头或直接点击触发器（非链接文本）时才阻止跳转
        if (target === arrow || target === trigger || !navText?.contains(target)) {
          e.preventDefault();
          parent.classList.toggle("expanded");
        }
      }
    }
  });
}

// 返回顶部按钮：滚动 300px 后显示；点击回顶；长按返回上一页
function initBackToTop() {
  const mobileBtn = document.getElementById("back-to-top") as HTMLButtonElement | null;
  const pcBtn = document.getElementById("pc-back-to-top") as HTMLButtonElement | null;

  if (!mobileBtn && !pcBtn) return;

  // 避免重复绑定
  if ((mobileBtn as any)?._inited) return;
  if (mobileBtn) (mobileBtn as any)._inited = true;

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

  // 初始与滚动时更新
  updateVisibility();
  window.addEventListener("scroll", updateVisibility, { passive: true });

  // 移动端按钮保留长按逻辑
  if (mobileBtn) {
    let pressTimer: number | null = null;
    let longPressed = false;
    const pressDuration = 600; // ms

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

