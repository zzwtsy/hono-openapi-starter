import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { logger } from "../core/logger/index.js";
import { client, db } from "./client.js";

// migrations 文件夹相对脚本位置：开发时 src/db/migrations；
// 生产构建后需把 migrations copy 到 dist/db/migrations（tsc 不 copy .sql，构建脚本/Dockerfile 处理）。
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "migrations");

// 作为独立命令运行（docker command / pnpm db:migrate），不在 app 启动时调用。
async function main() {
  await migrate(db, { migrationsFolder });
  logger.info("migrated");
  // 关闭连接池,否则 postgres-js 保持 socket 活跃,进程不退出。
  await client.end();
}

main().catch((error) => {
  logger.withError(error).error("migration failed");
  process.exit(1);
});
