import { relations } from "drizzle-orm";
import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

import { user } from "./auth-schema.js";
import { updatedAtColumn } from "./shared/index.js";

/**
 * 系统设置:key-value 模式存储运行时可编辑配置(脱离 env,管理员 UI 修改)。
 *
 * `key` 是配置名(如 "signUp"),`value` 是动态 JSON(value 结构按 key 不同)。
 * value 列类型保持 jsonb 默认(unknown):drizzle 列类型是静态的,在此"动态多态 jsonb"
 * (多 key 共用一列、各 key 不同 schema)场景下硬标 $type<T> 会失真——
 * 标单一 T 无法覆盖未来新 key;标 union 要求 db schema 反向 import 各 feature 的 value schema,
 * 破 db -> features 依赖方向(architecture/backend.md)。故 value 类型由运行时按 key 窄化,
 * 单一来源在 features/system-settings/schemas.ts 的 settingRegistry(key -> Zod valueSchema)。
 * service 用泛型 get<K extends SettingKey> + safeParse 把 unknown 窄化为对应 key 的 value 类型。
 * key 天然主键,无 id/createdAt;updatedAt 记录最后修改时间。
 * `updatedByUserId` 引用 user.id(set null on delete),审计追踪修改者。
 *
 * 设计见 [ADR-0007](../../../docs/adr/0007-runtime-config-control.md)。
 */
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  // 动态多态 jsonb:列类型保持 unknown,按 key 用 settingRegistry 的 valueSchema 运行时窄化(见类注释)。
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
