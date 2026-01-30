import type Alpine from "alpinejs";

interface UserInfo {
  name: string;
  avatar?: string;
  roleDisplayName?: string;
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
            const roleDisplayName =
              data.roles?.[0]?.metadata?.annotations?.["rbac.authorization.halo.run/display-name"];
            this.currentUser = {
              name: data.user?.spec?.displayName || userName,
              avatar: data.user?.spec?.avatar,
              roleDisplayName: roleDisplayName,
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
      this.toggleMenu();
    },
  }));
}
