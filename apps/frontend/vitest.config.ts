import path from "node:path";
import { defineConfig } from "vitest/config";

// 与 vite.config / tsconfig paths 的 `@/*` 对齐。
const srcAlias = { "@": path.resolve(import.meta.dirname, "src") };

export default defineConfig({
  resolve: { alias: srcAlias },
  test: {
    name: "unit",
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // 首批测试不依赖样式；避免 css 解析噪音
    css: false,
  },
});
