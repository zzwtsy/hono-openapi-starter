import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * 集成测试 globalSetup:起一次性 PG 容器,跑 migration,把容器连接串写入 `DATABASE_URL`,
 * 让 worker 里的全局 `db`(db/client.ts)自动连容器。teardown 停容器。
 *
 * 同时设置 `EnvSchema` 其余必需 env(测试专用值),让 env.ts 校验通过——不依赖 .env.test 文件。
 * 见 [测试策略](../../../docs/conventions/testing-strategy.md) 集成测试基础设施。
 */

/** 测试专用 env(无真实密钥,仅供 EnvSchema 校验通过)。 */
const TEST_ENV = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long-placeholder",
  BETTER_AUTH_URL: "http://localhost:3001",
  DISABLE_SIGN_UP: "true",
} as const;

let container: StartedPostgreSqlContainer | undefined;

export async function setup() {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const databaseUrl = container.getConnectionUri();

  // env 先就绪:worker 启动 import db/client 时 env.ts 会校验。
  process.env.NODE_ENV = TEST_ENV.NODE_ENV;
  process.env.DATABASE_URL = databaseUrl;
  process.env.LOG_LEVEL = TEST_ENV.LOG_LEVEL;
  process.env.BETTER_AUTH_SECRET = TEST_ENV.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_URL = TEST_ENV.BETTER_AUTH_URL;
  process.env.DISABLE_SIGN_UP = TEST_ENV.DISABLE_SIGN_UP;

  // 独立 client 跑 migration,跑完关闭,不影响 worker 的全局 db 连接。
  // migrations 在 src/db/migrations(tests/helpers 在 src 平级,需跨入 src)。
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle({ client });
  const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/db/migrations");
  await migrate(db, { migrationsFolder });
  await client.end();
}

export async function teardown() {
  await container?.stop();
}
