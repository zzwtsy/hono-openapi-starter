import type { SettingRegistryEntry } from "./schemas.js";

import { asc, eq } from "drizzle-orm";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { systemSettings } from "@/db/schema/index.js";
import { settingRegistry } from "./schemas.js";

// registry 索引访问:空时 SettingKey = never,泛型窄化无意义,用 string + 运行时查。
const registry = settingRegistry as Record<string, SettingRegistryEntry>;

/**
 * 系统设置 service:运行时可编辑配置的读写(upsert 语义)。
 *
 * 全局资源(不挂 org),不接收 Hono context。权限检查由 requirePermission 中间件完成。
 * 类型安全:每个 key 对应一个 Zod valueSchema,写入前 parse 校验,读取时 safeParse 降级;
 * key 不在 registry 时 get 返回 null、upsert 抛 COMMON_VALIDATION_FAILED。
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
      const parsed = registry[row.key]?.valueSchema.safeParse(row.value);
      return parsed?.success ? [{ ...row, value: parsed.data }] : [];
    });
  },

  /**
   * 取单条;key 不在 registry、记录不存在或 value 脏数据(不符合 schema)返回 null。
   * 供运行时判定,不抛错(脏数据降级而非 crash)。
   */
  async get(key: string) {
    const entry = registry[key];
    if (entry == null) {
      return null;
    }
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    if (row == null) {
      return null;
    }
    const parsed = entry.valueSchema.safeParse(row.value);
    if (!parsed.success) {
      return null;
    }
    return { ...row, value: parsed.data };
  },

  /**
   * upsert 一条配置;返回写入后的行(value 已窄化)。updatedByUserId 记录修改者。
   * key 不在 registry 抛 COMMON_VALIDATION_FAILED;写入前用 valueSchema parse 校验。
   */
  async upsert(key: string, value: unknown, updatedByUserId: string) {
    const entry = registry[key];
    if (entry == null) {
      throw new AppError("COMMON_VALIDATION_FAILED", { message: "未知配置项" });
    }
    const parsed = entry.valueSchema.safeParse(value);
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
