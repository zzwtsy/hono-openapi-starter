import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema.js";
import { createdAtColumn, idColumn, updatedAtColumn } from "./shared/index.js";

/**
 * 权限层 6 表(自建,与 Better Auth 解耦,唯一联系是 user.id 外键)。
 *
 * 设计见 [权限层规范](../../../docs/conventions/authorization.md)、ADR-0004。
 * 列名 snake_case,id 用 text PK,时间戳用 shared helper(均带时区)。
 * 外键列均建索引:checkPermission 按 user_id/org_id/role_id/parent_id 过滤或 JOIN。
 */

/** 组织:树形结构,parent_id 自引用(总部→华南→福建/深圳)。 */
export const organizations = pgTable("organizations", {
  id: idColumn(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): AnyPgColumn => organizations.id),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, t => [
  index("organizations_parent_id_idx").on(t.parentId),
]);

/** 角色:权限集合(如 admin、viewer)。`source` 区分代码同步角色(code,不可改删)与管理 API 创建角色(instance)。 */
export const roles = pgTable("roles", {
  id: idColumn(),
  name: text("name").notNull().unique(),
  description: text("description"),
  source: text("source", { enum: ["code", "instance"] }).notNull().default("instance"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

/** 权限:`<resource>.<action>`(如 users.read),name 作 PK,用于运行时枚举与管理界面展示。 */
export const permissions = pgTable("permissions", {
  name: text("name").primaryKey(),
  description: text("description"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

/** 角色-权限关联:角色含哪些权限。 */
export const rolePermissions = pgTable("role_permissions", {
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permission: text("permission").notNull().references(() => permissions.name, { onDelete: "cascade" }),
}, t => [
  primaryKey({ columns: [t.roleId, t.permission] }),
  index("role_permissions_role_id_idx").on(t.roleId),
]);

/** 用户-角色:在某组织授用户角色,可多角色,支持过期。同用户同组织可多行(不同 role_id)。 */
export const userRoles = pgTable("user_roles", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
}, t => [
  primaryKey({ columns: [t.userId, t.roleId, t.orgId] }),
  index("user_roles_user_id_idx").on(t.userId),
  index("user_roles_org_id_idx").on(t.orgId),
]);

/** 用户-直接权限:在某组织直接授 allow/deny,绕过角色,支持过期。 */
export const userPermissions = pgTable("user_permissions", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  permission: text("permission").notNull().references(() => permissions.name, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  effect: text("effect", { enum: ["allow", "deny"] }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
}, t => [
  primaryKey({ columns: [t.userId, t.permission, t.orgId] }),
  index("user_permissions_user_id_idx").on(t.userId),
  index("user_permissions_org_id_idx").on(t.orgId),
]);

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  parent: one(organizations, { fields: [organizations.parentId], references: [organizations.id], relationName: "org_tree" }),
  children: many(organizations, { relationName: "org_tree" }),
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permission], references: [permissions.name] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(user, { fields: [userRoles.userId], references: [user.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  org: one(organizations, { fields: [userRoles.orgId], references: [organizations.id] }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(user, { fields: [userPermissions.userId], references: [user.id] }),
  permission: one(permissions, { fields: [userPermissions.permission], references: [permissions.name] }),
  org: one(organizations, { fields: [userPermissions.orgId], references: [organizations.id] }),
}));
