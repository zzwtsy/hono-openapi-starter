import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// vitest 4 projects 模式下,顶层 resolve 不被 project 继承,需在每个 project 配置。
const srcAlias = { "@": resolve(import.meta.dirname, "src") };

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
        resolve: { alias: srcAlias },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["./src/test/global-setup.ts"],
        },
        resolve: { alias: srcAlias },
      },
    ],
  },
});
