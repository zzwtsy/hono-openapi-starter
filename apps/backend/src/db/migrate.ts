import process from "node:process";

import { logger } from "../core/logger/index.js";
import env from "../env.js";
import { runMigrations } from "./run-migrations.js";

// 作为独立命令运行（docker command / pnpm db:migrate），不在 app 启动时调用。
// runMigrations 用一次性连接跑迁移并关闭,不创建 app 的全局连接池。
async function main() {
  await runMigrations(env.DATABASE_URL);
  logger.info("migrated");
}

main().catch((error) => {
  logger.withError(error).error("migration failed");
  process.exit(1);
});
