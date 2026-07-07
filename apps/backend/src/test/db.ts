import { sql } from "drizzle-orm";

import { db } from "../db/client.js";

/**
 * 清空所有业务表(Better Auth 4 表 + 权限层 6 表),集成测试每个 case 前调用,保证隔离。
 *
 * 用全局 `db`:integration worker 里 `DATABASE_URL` 已被 globalSetup 指向 testcontainers 容器。
 * CASCADE 处理外键,无需关心顺序。
 */
export async function resetDb() {
  await db.execute(sql`
    TRUNCATE TABLE
      "user", "session", "account", "verification",
      "organizations", "roles", "permissions", "role_permissions", "user_roles", "user_permissions"
    CASCADE
  `);
}
