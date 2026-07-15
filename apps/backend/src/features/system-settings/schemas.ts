import { z } from "@hono/zod-openapi";

// --- registry:配置项单一来源(类型 + 运行时 + 文档同源) ---
// 新增配置项:在 settingRegistry 加一行(key + valueSchema + description),schema 自动派生。
// 与 AppPermissionRegistry 范式同构:一份 registry 驱动类型/运行时/OpenAPI 三者。

/** signUp 配置值:是否开启用户注册。 */
const signUpValueSchema = z.object({
  enabled: z.boolean().openapi({ description: "是否开启", example: true }),
}).openapi("SignUpValue");

/**
 * 系统配置 registry:每个 key 对应一份 valueSchema + 描述。
 *
 * `as const` 保留字面量类型(SettingKey = "signUp"),运行时遍历取 valueSchema 做校验。
 */
export const settingRegistry = {
  signUp: {
    valueSchema: signUpValueSchema,
    description: "是否开启用户注册",
  },
} as const;

/** 全部配置 key 的字面量联合类型。 */
export type SettingKey = keyof typeof settingRegistry;

/** 全部 value schema 的数组(供 z.union 构造 OpenAPI oneOf 表达)。 */
const allValueSchemas = Object.values(settingRegistry).map(s => s.valueSchema);

/** 全部 key 的字面量数组(供 z.enum 构造 path 参数校验)。 */
const allKeys = Object.keys(settingRegistry) as [SettingKey, ...SettingKey[]];

// --- API schema ---

/** key 路径参数:只接受 registry 里已声明的 key,未知 key 直接 422。 */
export const SettingKeyParamSchema = z.object({
  key: z.enum(allKeys).openapi({ description: "配置名", example: "signUp" }),
});

/** PATCH body: { value: <对应 key 的 value schema> }。 */
export const UpdateSettingSchema = z.object({
  value: z.union(allValueSchemas).openapi({ description: "配置值(JSON)", example: { enabled: false } }),
}).openapi("UpdateSetting");

/** 系统设置响应 schema。 */
export const SystemSettingSchema = z.object({
  key: z.string().openapi({ description: "配置名", example: "signUp" }),
  value: z.union(allValueSchemas).openapi({ description: "配置值(JSON)", example: { enabled: true } }),
  updatedAt: z.iso.datetime().openapi({ description: "最后修改时间(ISO 8601)", example: "2026-07-15T00:00:00.000Z" }),
  updatedByUserId: z.string().nullable().openapi({ description: "最后修改者用户 ID", example: "u-1" }),
}).openapi("SystemSetting");
