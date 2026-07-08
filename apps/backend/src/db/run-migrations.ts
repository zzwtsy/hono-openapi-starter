import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// migrations 文件夹相对本文件位置:开发时 src/db/migrations;
// 生产构建后需把 migrations copy 到 dist/db/migrations(tsc 不 copy .sql,构建脚本/Dockerfile 处理)。
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "migrations");

/**
 * 用一次性连接(max:1)跑 drizzle migration,跑完关闭——不在 app 运行时调用。
 *
 * 供 `db:migrate` 命令(src/db/migrate.ts)与集成测试 globalSetup(tests/helpers/global-setup.ts)
 * 共用,单一来源维护 migrations 文件夹路径与 migrate+close 序列,避免两处漂移。
 */
export async function runMigrations(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle({ client });
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await client.end().catch(() => {});
  }
}
