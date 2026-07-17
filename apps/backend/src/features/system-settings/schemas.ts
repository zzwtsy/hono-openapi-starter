import { z } from "@hono/zod-openapi";

// --- registry:配置项单一来源(类型 + 运行时 + 文档同源) ---
// 新增配置项:在 settingRegistry 加一行(key + valueSchema + description),schema 自动派生。
// 与 AppPermissionRegistry 范式同构:一份 registry 驱动类型/运行时/OpenAPI 三者。
//
// 当前无内置配置项(signUp 注册开关已随「移除自助注册」退役,见 ADR-0007 superseded 注记)。
// system_settings 表与 API 保留,后续新增运行时配置在此加 key 即可。

/** registry 单项:value schema + 描述。 */
export interface SettingRegistryEntry {
  valueSchema: z.ZodType;
  description: string;
}

/**
 * 系统配置 registry:每个 key 对应一份 valueSchema + 描述。
 *
 * `as const` 保留字面量类型(SettingKey),`satisfies Record<string, SettingRegistryEntry>` 保证元素类型。
 * 空时 SettingKey = never:list 返回空,update 任意 key 被 schema 拒(400)。
 */
export const settingRegistry = {
  // signUp 已退役(移除自助注册);后续新增配置项在此加
} as const satisfies Record<string, SettingRegistryEntry>;

/** 全部配置 key 的字面量联合类型。 */
export type SettingKey = keyof typeof settingRegistry;

/** 全部 value schema 的数组(供 z.union 构造 OpenAPI oneOf 表达)。 */
const allValueSchemas = Object.values(settingRegistry as Record<string, SettingRegistryEntry>).map(s => s.valueSchema);

/** 全部 key 的字面量数组(供 z.enum 构造 path 参数校验)。 */
const allKeys = Object.keys(settingRegistry) as SettingKey[];

// --- API schema ---

/**
 * key 路径参数:只接受 registry 里已声明的 key,未知 key 直接 400。
 * registry 非空时用 z.enum(OpenAPI 枚举精确);空时用 z.string + refine 拒绝(z.enum 空数组会 throw)。
 */
const keyParamSchema = allKeys.length > 0
  ? z.enum(allKeys as [SettingKey, ...SettingKey[]])
  : z.string().refine(() => false, { message: "无可用配置项" });

export const SettingKeyParamSchema = z.object({
  key: keyParamSchema.openapi({ description: "配置名", example: "exampleKey" }),
});

/**
 * value 联合:registry 非空时 z.union(oneOf);空时 z.unknown(z.union 空数组会 throw)。
 * 空时此分支不可达(keyParamSchema 拒所有 key)。z.unknown() 语义为任意 JSON(jsonb 列),
 * wormhole 对其生成 null 是已知生成器限制(见 globals.d.ts),不应在 schema 妥协成 z.record 限死为 object。
 */
const valueUnion = allValueSchemas.length > 0 ? z.union(allValueSchemas) : z.unknown();

/** PATCH body: { value: <对应 key 的 value schema> }。 */
export const UpdateSettingSchema = z.object({
  value: valueUnion.openapi({ description: "配置值(JSON)", example: {} }),
}).openapi("UpdateSetting");

/** 系统设置响应 schema。 */
export const SystemSettingSchema = z.object({
  key: z.string().openapi({ description: "配置名", example: "exampleKey" }),
  value: valueUnion.openapi({ description: "配置值(JSON)", example: {} }),
  updatedAt: z.iso.datetime().openapi({ description: "最后修改时间(ISO 8601)", example: "2026-07-15T00:00:00.000Z" }),
  updatedByUserId: z.string().nullable().openapi({ description: "最后修改者用户 ID", example: "u-1" }),
}).openapi("SystemSetting");
