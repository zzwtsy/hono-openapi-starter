import { relations } from "drizzle-orm";
import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

import { user } from "./auth-schema.js";
import { updatedAtColumn } from "./shared/index.js";

/**
 * 系统设置:key-value 模式存储运行时可编辑配置(脱离 env,管理员 UI 修改)。
 *
 * `key` 是配置名(如 "signUp"),`value` 是 JSON(如 { "enabled": true })。
 * key 天然主键,无 id/createdAt;updatedAt 记录最后修改时间。
 * `updatedByUserId` 引用 user.id(set null on delete),审计追踪修改者。
 *
 * 设计见 [ADR-0007](../../../docs/adr/0007-runtime-config-control.md)。
 */
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAtColumn(),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
});

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedBy: one(user, {
    fields: [systemSettings.updatedByUserId],
    references: [user.id],
  }),
}));
