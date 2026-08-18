/**
 * 使用一次性数据库连接执行仓库内已提交的 Drizzle migrations。
 *
 * 该命令供部署和本地维护显式调用，不参与应用启动，也不创建应用全局连接池。
 * migration 失败时以非零状态退出；一次性连接由 `runMigrations` 在成功或失败后关闭。
 */
import process from "node:process";

import env from "@/config/env.js";
import { logger } from "@/core/logger/index.js";
import { runMigrations } from "@/db/run-migrations.js";

async function main() {
  await runMigrations(env.DATABASE_URL);
  logger.info("migrated");
}

main().catch((error) => {
  logger.withError(error).error("migration failed");
  process.exitCode = 1;
});
