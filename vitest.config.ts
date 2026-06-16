import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Config dedicada a testes — separada do vite.config.ts da app porque o
// wrapper @lovable.dev/vite-tanstack-config injeta plugins de SSR/Cloudflare
// que não fazem sentido em ambiente de teste node.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/**/*.ts",
        "src/hooks/use-taxa-sistema.ts",
      ],
      exclude: [
        "src/lib/**/*.server.ts",
        "src/lib/**/*.functions.ts",
        "src/lib/**/index.ts",
        "src/lib/**/*.test.ts",
      ],
    },
  },
});
