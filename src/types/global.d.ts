import type Alpine from "alpinejs";
import type { MomentPosterData, MomentPosterResult } from "../utils/moment-poster";

declare module "@alpinejs/collapse";

declare global {
  interface MusicConfig {
    server: "netease" | "tencent" | "kugou";
    type: "playlist" | "album" | "artist" | "song";
    id: string;
    api_url?: string;
    custom_params?: string;
    order?: "list" | "random";
    position?: "right" | "left";
    volume?: number;
    autoplay?: boolean;
    showLrc?: boolean;
    enabledDrag?: boolean;
  }

  interface Window {
    Alpine: typeof Alpine;
    mountPhotoGallery: (container: HTMLElement, groups: unknown[]) => void;
    mountWeather: (container: HTMLElement, apiKey: string, iconBase: string) => void;
    generateQRCode: (container: HTMLElement, url: string) => Promise<void>;
    generatePoster: (element: HTMLElement, title: string, defaultCover?: string) => Promise<void>;
    generateMomentPoster: (data: MomentPosterData) => Promise<MomentPosterResult>;
    openShuttle: (options: ShuttleOptions) => void;
    goToPageNumber: (button: HTMLElement) => void;
    MUSIC_CONFIG?: MusicConfig;
    themeConfig?: {
      custom?: {
        img_alt?: boolean;
        enable_fancybox?: boolean;
        enable_swup?: boolean;
        swup_timeout?: number;
        caption_blacklist?: Array<{ class_name?: string; realNode?: { class_name?: string } }>;
      };
      style?: {
        theme_mode?: "light" | "dark" | "system";
      };
    };
    reinitializeComponents?: () => void;
    XhhaoComContentWidgets?: {
      mount: (root: Document | HTMLElement) => void;
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
