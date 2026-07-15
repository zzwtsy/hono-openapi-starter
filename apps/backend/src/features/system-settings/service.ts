import type { SettingKey } from "./schemas.js";

import { asc, eq } from "drizzle-orm";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { systemSettings } from "@/db/schema/index.js";
import { settingRegistry } from "./schemas.js";

/**
 * 系统设置 service:运行时可编辑配置的读写(upsert 语义)。
 *
 * 全局资源(不挂 org),不接收 Hono context。权限检查由 requirePermission 中间件完成。
 * 类型安全:每个 key 对应一个 Zod valueSchema,写入前 parse 校验,读取时 safeParse 降级。
 */
export const SystemSettingService = {
  /**
   * 列出全部配置(按 key 确定性排序)。
   * 仅返回 value 符合 registry schema 的行(写入时 upsert 已校验,正常无脏数据;脏数据降级过滤)。
   */
  async list() {
    const rows = await db
      .select()
      .from(systemSettings)
      .orderBy(asc(systemSettings.key));
    return rows.flatMap((row) => {
      const parsed = settingRegistry[row.key as SettingKey]?.valueSchema.safeParse(row.value);
      return parsed?.success ? [{ ...row, value: parsed.data }] : [];
    });
  },

  /**
   * 取单条;不存在或 value 脏数据(不符合 registry schema)返回 null。
   * 供 hooks.before 判定,不抛错(脏数据降级而非 crash)。
   * 泛型 <K>:返回 value 窄化为 key 对应 valueSchema 的输出类型(调用方按 key 拿到精确类型)。
   */
  async get<K extends SettingKey>(key: K) {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    if (row == null) {
      return null;
    }
    const parsed = settingRegistry[key].valueSchema.safeParse(row.value);
    if (!parsed.success) {
      return null;
    }
    return { ...row, value: parsed.data };
  },

  /**
   * upsert 一条配置;返回写入后的行(value 已窄化)。updatedByUserId 记录修改者。
   * 写入前用 registry 的 valueSchema parse 校验,脏数据抛 COMMON_VALIDATION_FAILED。
   * 泛型 <K>:返回 value 窄化为 key 对应 valueSchema 的输出类型。
   */
  async upsert<K extends SettingKey>(key: K, value: unknown, updatedByUserId: string) {
    const parsed = settingRegistry[key].valueSchema.safeParse(value);
    if (!parsed.success) {
      throw new AppError("COMMON_VALIDATION_FAILED", { details: parsed.error.issues });
    }
    const [row] = await db
      .insert(systemSettings)
      .values({ key, value: parsed.data, updatedByUserId })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: parsed.data, updatedByUserId },
      })
      .returning();
    return { ...row, value: parsed.data };
  },
};
