import { resolve } from "node:path";
import process from "node:process";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // 分离 unit / integration:unit 不起容器(默认 pnpm test);integration 起 testcontainers 容器。
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["./src/test/global-setup.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
    },
  },
});
