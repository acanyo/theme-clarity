import type Alpine from "alpinejs";

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

      const path = window.location.pathname;
      const search = window.location.search;
      const params = new URLSearchParams(search);

      if (params.has("keyword")) {
        params.set("page", String(p));
        return `${path}?${params.toString()}`;
      }

      let baseUrl = path.replace(/\/page\/\d+$/, "");
      if (baseUrl.length > 1 && baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }

      if (p === 1) {
        return baseUrl || "/";
      }
      return baseUrl === "/" ? `/page/${p}` : `${baseUrl}/page/${p}`;
    },
  }));
}

window.jumpToPage = function (button: HTMLElement) {
  const container = button.closest(".page-jump");
  if (!container) return;

  const input = container.querySelector(".page-input") as HTMLInputElement;
  if (!input) return;

  const targetPage = parseInt(input.value);
  const currentPage = parseInt(input.dataset.currentPage || "1");
  const totalPages = parseInt(input.dataset.totalPages || "1");

  if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
    alert("请输入有效的页码");
    return;
  }

  if (targetPage === currentPage) {
    return;
  }

  const path = window.location.pathname;
  const search = window.location.search;
  const params = new URLSearchParams(search);

  if (params.has("page")) {
    params.set("page", String(targetPage));
    window.location.href = `${path}?${params.toString()}`;
    return;
  }

  if (params.size > 0) {
    let baseUrl = path.replace(/\/page\/\d+$/, "");
    if (baseUrl.length > 1 && baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (targetPage === 1) {
      window.location.href = `${baseUrl || "/"}?${params.toString()}`;
    } else {
      window.location.href = `${baseUrl === "/" ? "" : baseUrl}/page/${targetPage}?${params.toString()}`;
    }
    return;
  }

  let baseUrl = path.replace(/\/page\/\d+$/, "");
  if (baseUrl.length > 1 && baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  if (targetPage === 1) {
    window.location.href = baseUrl || "/";
  } else {
    window.location.href = baseUrl === "/" ? `/page/${targetPage}` : `${baseUrl}/page/${targetPage}`;
  }
};

window.jumpToPageWithPattern = function (button: HTMLElement) {
  const container = button.closest(".page-jump");
  if (!container) return;

  const input = container.querySelector(".page-input") as HTMLInputElement;
  if (!input) return;

  const targetPage = parseInt(input.value);
  const currentPage = parseInt(input.dataset.currentPage || "1");
  const totalPages = parseInt(input.dataset.totalPages || "1");
  const urlPattern = input.dataset.urlPattern || "/page/{page}";
  const firstPageUrl = input.dataset.firstPageUrl || "/";

  if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
    alert("请输入有效的页码");
    return;
  }

  if (targetPage === currentPage) {
    return;
  }

  const search = window.location.search;
  const params = new URLSearchParams(search);

  let targetUrl: string;
  if (targetPage === 1) {
    targetUrl = firstPageUrl;
  } else {
    targetUrl = urlPattern.replace("{page}", String(targetPage));
  }

  if (params.size > 0) {
    const separator = targetUrl.includes("?") ? "&" : "?";
    targetUrl = `${targetUrl}${separator}${params.toString()}`;
  }

  window.location.href = targetUrl;
};
