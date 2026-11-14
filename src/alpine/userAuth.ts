import type Alpine from "alpinejs";

interface UserInfo {
  name: string;
  avatar?: string;
  roleDisplayName?: string;
}

// 认证流程页面不能作为登录/登出后的回跳目标，否则会再次回到登录、注册、重置密码等页面
const AUTH_ROUTE_BLACKLIST = [
  "/login",
  "/logout",
  "/signup",
  "/password-reset",
  "/complete-profile",
  "/challenges",
  "/setup",
];

const isAuthRoute = (pathname: string) =>
  AUTH_ROUTE_BLACKLIST.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export function registerUserAuth(alpine: typeof Alpine) {
  alpine.data("userAuth", () => ({
    currentUser: null as UserInfo | null,
    showMenu: false,
    ready: false,
    redirectUri: "",

    init() {
      this.updateRedirectUri();
      this.checkLoginStatus();
      // swup 切换页面后更新 redirectUri
      window.addEventListener("swup:success", () => {
        this.updateRedirectUri();
      });
    },

    updateRedirectUri() {
      const { pathname, search } = window.location;
      // 处于认证流程页面时回退到首页，避免登录/登出后再次回到这些页面
      this.redirectUri = isAuthRoute(pathname) ? "/" : pathname + search;
    },

    get loginUrl() {
      return `/login?redirect_uri=${encodeURIComponent(this.redirectUri)}`;
    },

    get logoutUrl() {
      return `/logout?redirect_uri=${encodeURIComponent(this.redirectUri)}`;
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
