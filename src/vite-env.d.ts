/// <reference types="vite/client" />

import type { Alpine } from "alpinejs";

// Alpine.js 插件类型声明
declare module "@alpinejs/collapse" {
  const collapse: (Alpine: Alpine) => void;
  export default collapse;
}

export {};

declare global {
  interface Window {
    Alpine: Alpine;
  }
}
