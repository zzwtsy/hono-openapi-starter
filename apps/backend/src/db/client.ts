import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import env from "../env.js";
import * as schema from "./schema/index.js";

// 连接池句柄保持模块私有:外部只需 `db`(查询)与 `closeDb()`(收尾),
// 不应直接拿到裸 postgres client(可绕过 drizzle 或误调 end() 杀全进程池)。
const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle({
  client,
  schema,
  logger: env.NODE_ENV === "development",
});

/**
 * 关闭底层 postgres 连接池。
 *
 * 供独立脚本(migrate/seed)与集成测试 worker 收尾调用,避免 postgres-js 保持 socket
 * 活跃导致进程不退出。app 运行时不调用(由进程退出回收)。
 */
export async function closeDb() {
  await client.end();
}
