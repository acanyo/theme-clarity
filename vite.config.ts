import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import preact from "@preact/preset-vite";

export default ({ mode }: { mode: string }) => {
  const isProduction = mode === "production";
  const entries = {
    main: path.resolve(__dirname, "src/main.ts"),
    auth: path.resolve(__dirname, "src/auth.ts"),
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
              return "vendor";
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
