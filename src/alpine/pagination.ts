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
