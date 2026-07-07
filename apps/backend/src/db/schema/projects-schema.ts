import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";

import { organizations } from "./authorization-schema.js";
import { createdAtColumn, idColumn, updatedAtColumn } from "./shared/index.js";

/**
 * projects 表:业务项目,属于某组织。
 *
 * `org_id` 外键引用 organizations,按组织查询(索引)。
 * 只读 feature 先支持 list/detail,create/update/delete 后续扩展。
 */
export const projects = pgTable("projects", {
  id: idColumn(),
  name: text("name").notNull(),
  description: text("description"),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, t => [
  index("projects_org_id_idx").on(t.orgId),
]);

export const projectsRelations = relations(projects, ({ one }) => ({
  org: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
}));
