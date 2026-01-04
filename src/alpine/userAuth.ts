import type Alpine from "alpinejs";

interface UserInfo {
  name: string;
  avatar?: string;
  isAdmin: boolean;
}

export function registerUserAuth(alpine: typeof Alpine) {
  alpine.data("userAuth", () => ({
    currentUser: null as UserInfo | null,
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
}
