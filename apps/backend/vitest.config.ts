import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// vitest 4 projects 模式下,顶层 resolve 不被 project 继承,需在每个 project 配置。
const srcAlias = { "@": resolve(import.meta.dirname, "src") };

export default defineConfig({
  test: {
    environment: "node",
    // integration 文件共享同一个 testcontainers PG,resetDb 会 TRUNCATE 全表;
    // 串行执行避免文件间互相清表导致 FK 失败。unit 文件无共享状态,串行也无副作用。
    // isolate 仍为 true(每文件独立 worker,各持独立 db 池),closeDb afterAll 不受影响。
    fileParallelism: false,
    // 分离 unit / integration 按目录划分(非文件名后缀):unit 在 src/ 下(不起容器,默认 pnpm test);
    // integration 在 tests/integration/ 下(globalSetup 起 testcontainers 容器)。
    // 目录边界让误归类在目录树里显式可见,而非藏在文件名里。
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
        },
        resolve: { alias: srcAlias },
      },
      {
        test: {
          name: "contract",
          include: ["tests/contract/**/*.test.ts"],
          setupFiles: ["./tests/helpers/contract-setup.ts"],
        },
        resolve: { alias: srcAlias },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/helpers/global-setup.ts"],
          // setupFiles 的 afterAll(closeDb) 依赖默认 isolate: true(每测试文件独立 worker,各持独立 db 池);
          // 若改 pool 配置(如 singleFork 共享 worker),需同步调整 teardown,否则前文件关池后后续文件拿到已关闭的池。
          setupFiles: ["./tests/helpers/integration-teardown.ts"],
        },
        resolve: { alias: srcAlias },
      },
    ],
  },
});
