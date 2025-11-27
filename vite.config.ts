import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import preact from "@preact/preset-vite";

export default ({ mode }: { mode: string }) => {
  const isProduction = mode === "production";
  // 定义多个入口
  const entries = {
    main: path.resolve(__dirname, "src/main.ts"),
    plugins: path.resolve(__dirname, "src/plugins/index.ts"),
    // photo: path.resolve(__dirname, "photo.ts"),
    // 可继续添加，如：'profile': 'src/profile.ts'
  };

  return defineConfig({
    root: "./src",
    base: isProduction ? "/themes/theme-modern-starter/assets/dist/" : "",
    plugins: [tailwindcss(), preact()],
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    build: {
      manifest: isProduction,
      minify: isProduction,
      rollupOptions: {
        input: entries,
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("lodash-es")) return "lodash";
              if (id.includes("preact")) return "preact";
              // 其他第三方库可归到 vendor
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
