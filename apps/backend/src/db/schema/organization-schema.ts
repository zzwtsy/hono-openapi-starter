import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { index, pgTable, text } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./shared/index.js";

/**
 * 组织是认证用户与授权模型共同依赖的业务实体，因此独立于二者定义。
 * 此文件不得反向依赖 auth-schema 或 authorization-schema，避免 schema 循环引用。
 */
export const organizations = pgTable("organizations", {
  id: idColumn(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): AnyPgColumn => organizations.id),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, table => [
  index("organizations_parent_id_idx").on(table.parentId),
]);
