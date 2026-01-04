import type Alpine from "alpinejs";

export function registerSidebarControl(alpine: typeof Alpine) {
  alpine.data("sidebarControl", () => ({
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
}
