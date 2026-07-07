import type { Table } from "drizzle-orm";
import { getTableName, isTable, sql } from "drizzle-orm";

import { db } from "../../src/db/client.js";
import * as schema from "../../src/db/schema/index.js";

/**
 * 清空所有业务表,集成测试每个 case 前调用,保证隔离。
 *
 * 从 drizzle schema 遍历所有表对象(单一来源),新增表只要在 schema 定义并 export 即自动包含,
 * 无需手动维护表名列表。`isTable` 过滤掉 relations 和 helper 函数,只保留表对象。
 * 用全局 `db`:integration worker 里 `DATABASE_URL` 已被 globalSetup 指向 testcontainers 容器。
 * CASCADE 处理外键,无需关心顺序。
 */
export async function resetDb() {
  const tableList = Object.values(schema)
    .filter(isTable)
    // `as Table` 绕过 PgTableWithColumns 具体泛型与 Table 默认泛型不兼容(Column 配置泛型协变检查失败)
    .map(t => `"${getTableName(t as Table)}"`)
    .join(", ");
  await db.execute(sql`TRUNCATE TABLE ${sql.raw(tableList)} CASCADE`);
}
