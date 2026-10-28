import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import preact from "@preact/preset-vite";

// 获取 auth 目录下的所有 css 文件
function getAuthEntries(): Record<string, string> {
  const authDir = path.resolve(__dirname, "src/styles/auth");
  const entries: Record<string, string> = {};

  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir);
    files.forEach((file) => {
      if (file.endsWith(".css")) {
        const name = file.replace(".css", "");
        entries[`auth/${name}`] = path.resolve(authDir, file);
      }
    });
  }

  return entries;
}

export default ({ mode }: { mode: string }) => {
  const isProduction = mode === "production";
  const entries = {
    main: path.resolve(__dirname, "src/main.ts"),
    shop: path.resolve(__dirname, "src/styles/shop/main.scss"),
    moments: path.resolve(__dirname, "src/pages/moments.ts"),
    links: path.resolve(__dirname, "src/pages/links.ts"),
    friends: path.resolve(__dirname, "src/pages/friends.ts"),
    "page-friends": path.resolve(__dirname, "src/pages/page-friends.ts"),
    bangumis: path.resolve(__dirname, "src/styles/bangumis/main.scss"),
    photos: path.resolve(__dirname, "src/styles/photos/main.scss"),
    equipments: path.resolve(__dirname, "src/styles/equipments/main.scss"),
    steam: path.resolve(__dirname, "src/styles/steam/main.scss"),
    ...getAuthEntries(),
  };

  return defineConfig({
    root: "./src",
    base: isProduction ? "/themes/theme-clarity/assets/dist/" : "",
    plugins: [tailwindcss(), preact()],
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      legalComments: "none",
    },
    build: {
      manifest: isProduction,
      minify: isProduction ? "terser" : false,
      terserOptions: {
        format: {
          comments: false,
        },
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        input: entries,
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("lodash-es")) return "lodash";
              if (id.includes("preact")) return "preact";
              if (id.includes("@fancyapps")) return "fancybox";
              if (id.includes("alpinejs") || id.includes("@alpinejs")) return "alpinejs";
              if (id.includes("twikoo")) return "twikoo";
              if (id.includes("html2canvas")) return "html2canvas";
              if (id.includes("qrcode")) return "qrcode";
              if (id.includes("swup")) return "swup";
              if (id.includes("@chinese-fonts")) return "chinese-fonts";
              // Let Rollup split optional libraries and their dependencies by usage.
              // A catch-all vendor chunk would pull Mermaid into the homepage.
              return undefined;
            }
            return undefined;
          },
          entryFileNames: "[name].js",
          chunkFileNames: "[name].[hash].js",
          assetFileNames: "[name][extname]",
        },
        preserveEntrySignatures: "allow-extension",
      },
      outDir: fileURLToPath(new URL("./templates/assets/dist", import.meta.url)),
      emptyOutDir: true,
    },
    server: {
      origin: "http://localhost:5173",
    },
  });
};
