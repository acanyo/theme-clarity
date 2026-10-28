import type Alpine from "alpinejs";

export function registerThemeToggle(alpine: typeof Alpine) {
  alpine.data("themeToggle", () => ({
    theme: localStorage.getItem("theme") || (window as any).themeConfig?.style?.theme_mode || "system",

    init() {
      this.applyTheme(false);
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (this.theme === "system") {
          this.applyTheme(true);
        }
      });
    },

    setTheme(newTheme: string, event?: MouseEvent) {
      if (this.theme === newTheme) {
        return;
      }
      this.theme = newTheme;
      localStorage.setItem("theme", newTheme);
      this.applyTheme(true, event);
    },

    applyTheme(animate = true, event?: MouseEvent) {
      const html = document.documentElement;
      const isDark =
        this.theme === "dark" || (this.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

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

      if (animate && document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.dispatchEvent(new Event("clarity:cancel-transition"));
        html.dataset.themeTransition = isDark ? "dark" : "light";
        const transition = document.startViewTransition(updateDOM);
        void transition.finished.catch(() => {}).finally(() => delete html.dataset.themeTransition);
      } else {
        updateDOM();
      }
    },
  }));
}
