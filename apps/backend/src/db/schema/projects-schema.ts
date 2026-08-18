import { relations } from "drizzle-orm";
import { index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { organizations } from "./organization-schema.js";
import { createdAtColumn, idColumn, updatedAtColumn } from "./shared/index.js";

/**
 * projects 表:业务项目,属于某组织。
 *
 * `org_id` 外键引用 organizations,按组织查询(索引)。
 * `(org_id, name)` 唯一约束保证同组织内项目名唯一，并阻止并发写入绕过应用层查重。
 * 不同组织允许重名。
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
  unique("projects_org_name_unq").on(t.orgId, t.name),
]);

export const projectsRelations = relations(projects, ({ one }) => ({
  org: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
}));
