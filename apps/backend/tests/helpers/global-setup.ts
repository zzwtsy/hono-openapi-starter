import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import process from "node:process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { runMigrations } from "../../src/db/run-migrations.js";

/**
 * 集成测试 globalSetup:起一次性 PG 容器,跑 migration,把容器连接串写入 `DATABASE_URL`,
 * 让 worker 里的全局 `db`(db/client.ts)自动连容器。teardown 停容器。
 *
 * 同时设置 `EnvSchema` 其余必需 env(测试专用值),让 env.ts 校验通过——不依赖 .env.test 文件。
 * 见 [测试策略](../../../docs/conventions/testing-strategy.md) 集成测试基础设施。
 */

/**
 * 测试专用 env(无真实密钥,仅供 EnvSchema 校验通过)。
 * 注意:需与 EnvSchema(src/core/app/env-validation.ts)的必填字段保持同步——新增必填项时这里也要补。
 */
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
  Object.assign(process.env, TEST_ENV, { DATABASE_URL: databaseUrl });

  // 跑 migration(复用 src/db/run-migrations.ts,单一来源维护 migrations 路径与 close 序列)。
  await runMigrations(databaseUrl);
}

export async function teardown() {
  await container?.stop();
}
