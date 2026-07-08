import { afterAll } from "vitest";

import { closeDb } from "../../src/db/client.js";

/**
 * 集成测试 worker 收尾:关闭全局 `db` 连接池。
 *
 * `globalSetup` 跑在主进程,关不到 worker 的池;本文件作为 integration project 的 `setupFiles`
 * 在 worker 内运行,`afterAll` 关池,避免 postgres-js 保持 socket 活跃导致 worker 无法自行退出
 * (与 `migrate.ts`/`seed.ts` 的 `closeDb` 修复同理)。每个测试文件在独立隔离环境(vitest 默认
 * `isolate: true`)各自持有池,`afterAll` 按文件收尾;若改 pool 配置(如 `singleFork` 共享 worker),
 * 需同步调整,否则前文件关池后后续文件拿到已关闭的池。
 */
afterAll(async () => {
  await closeDb();
});
