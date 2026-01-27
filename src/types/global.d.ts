import type Alpine from "alpinejs";

declare module "@alpinejs/collapse";

declare global {
  interface Window {
    Alpine: typeof Alpine;
    mountPhotoGallery: (container: HTMLElement, groups: unknown[]) => void;
    mountWeather: (container: HTMLElement, apiKey: string, iconBase: string) => void;
    generateQRCode: (container: HTMLElement, url: string) => Promise<void>;
    generatePoster: (element: HTMLElement, title: string) => Promise<void>;
    openShuttle: (options: ShuttleOptions) => void;
    jumpToPage: (button: HTMLElement) => void;
    jumpToPageWithPattern: (button: HTMLElement) => void;
    themeConfig?: {
      custom?: {
        img_alt?: boolean;
        enable_fancybox?: boolean;
      };
    };
  }

  interface ShuttleOptions {
    url: string;
    name: string;
    logo?: string;
    desc?: string;
  }

  // Halo 搜索插件提供的全局对象
  const SearchWidget:
    | {
        open: () => void;
      }
    | undefined;

  // View Transitions API
  interface Document {
    startViewTransition?: (callback: () => void) => void;
  }
}

export {};
