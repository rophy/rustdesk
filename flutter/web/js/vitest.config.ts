import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "./libsodium.mjs": path.resolve(
        __dirname,
        "node_modules/libsodium/dist/modules-esm/libsodium.mjs"
      ),
    },
  },
  test: {
    setupFiles: ["src/globals.setup.ts"],
    coverage: {
      all: true,
      include: ["src/**"],
      exclude: [
        "src/message.ts",
        "src/rendezvous.ts",
        "src/gen_js_from_hbb.ts",
        "src/vite-env.d.ts",
        "src/style.css",
        "src/main.ts",
        "src/globals.setup.ts",
        "src/ui.js",
      ],
    },
  },
});
