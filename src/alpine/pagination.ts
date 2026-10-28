import type Alpine from "alpinejs";
import { getSwupInstance } from "../swup/swup";
import { showToast } from "../utils/toast";

function navigateWithSwup(url: string) {
  const swup = getSwupInstance();
  if (swup && window.themeConfig?.custom?.enable_swup) {
    swup.navigate(url);
  } else {
    window.location.href = url;
  }
}

function buildPageUrl(targetPage: number): string {
  const path = window.location.pathname;
  const search = window.location.search;
  const params = new URLSearchParams(search);

  if (params.has("page")) {
    if (targetPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  }

  let baseUrl = path.replace(/\/page\/\d+\/?$/, "");
  if (baseUrl.length > 1 && baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  if (params.size > 0) {
    if (targetPage === 1) {
      return `${baseUrl || "/"}?${params.toString()}`;
    }
    return `${baseUrl === "/" ? "" : baseUrl}/page/${targetPage}?${params.toString()}`;
  }

  if (targetPage === 1) {
    return baseUrl || "/";
  }
  return baseUrl === "/" ? `/page/${targetPage}` : `${baseUrl}/page/${targetPage}`;
}

export function registerPagination(alpine: typeof Alpine) {
  alpine.data("pagination", (page: number, total: number) => ({
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
      return buildPageUrl(Number(p));
    },

    goToPage(p: number | string) {
      if (p === "...") return;
      const url = this.getPageUrl(p);
      navigateWithSwup(url);
    },
  }));
}

window.goToPageNumber = function (button: HTMLElement) {
  const pagination = button.closest(".pagination-wrapper");
  if (!pagination) return;

  const targetPage = parseInt(button.dataset.page || "0", 10);
  const currentPage = parseInt(pagination.getAttribute("data-current-page") || "1", 10);
  const totalPages = parseInt(pagination.getAttribute("data-total-pages") || "1", 10);

  if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages || targetPage === currentPage) {
    return;
  }

  navigateWithSwup(buildPageUrl(targetPage));
};

function initKeyboardNavigation() {
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;

    if (e.defaultPrevented || target.closest(".z-slide")) return;

    // 忽略标准输入元素
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return;
    }

    // 忽略可编辑元素
    if (target.isContentEditable) {
      return;
    }

    // 忽略评论区的输入
    if (target.closest(".z-comment")) {
      return;
    }

    const paginationWrapper = document.querySelector(".pagination-wrapper") || document.querySelector(".surround-post");
    if (!paginationWrapper) return;

    const prevUrl = paginationWrapper.getAttribute("data-prev-url");
    const nextUrl = paginationWrapper.getAttribute("data-next-url");

    if (e.key === "ArrowLeft" && prevUrl) {
      e.preventDefault();
      navigateWithSwup(prevUrl);
    } else if (e.key === "ArrowRight" && nextUrl) {
      e.preventDefault();
      navigateWithSwup(nextUrl);
    }
  });
}

initKeyboardNavigation();

//== 分页跳转功能 ==//
function initPaginationJump() {
  function updateJumpBtnTitle(input: HTMLInputElement) {
    const paginationWrapper = input.closest(".pagination-wrapper");
    if (!paginationWrapper) return;

    const jumpBtn = paginationWrapper.querySelector(".pagination-jump-btn") as HTMLElement | null;
    if (!jumpBtn) return;

    const value = input.value.trim();
    const pageNum = parseInt(value, 10);

    if (value === "" || isNaN(pageNum) || pageNum < 1) {
      jumpBtn.title = "跳转";
    } else {
      jumpBtn.title = `跳转到第 ${pageNum} 页`;
    }
  }

  document.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const jumpBtn = target.closest(".pagination-jump-btn") as HTMLElement | null;
    if (!jumpBtn) return;

    const paginationWrapper = jumpBtn.closest(".pagination-wrapper");
    if (!paginationWrapper) return;

    const input = paginationWrapper.querySelector(".pagination-jump-input") as HTMLInputElement | null;
    if (!input) return;

    const targetPage = parseInt(input.value, 10);
    const currentPage = parseInt(paginationWrapper.getAttribute("data-current-page") || "1", 10);
    const totalPages = parseInt(
      paginationWrapper.getAttribute("data-total-pages") || input.dataset.totalPages || "1",
      10,
    );

    if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages || targetPage === currentPage) {
      if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
        showToast(`请输入有效的页码 (1-${totalPages})`, "warning");
      }
      input.value = "";
      updateJumpBtnTitle(input);
      return;
    }

    navigateWithSwup(buildPageUrl(targetPage));
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("pagination-jump-input")) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const paginationWrapper = target.closest(".pagination-wrapper");
      if (!paginationWrapper) return;

      const jumpBtn = paginationWrapper.querySelector(".pagination-jump-btn") as HTMLElement | null;
      if (jumpBtn) {
        jumpBtn.click();
      }
    }
  });

  document.addEventListener("input", (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("pagination-jump-input")) return;
    updateJumpBtnTitle(target as HTMLInputElement);
  });
}

initPaginationJump();
//== 分页跳转功能 end ==//
