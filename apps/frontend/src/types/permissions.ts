import type { Me } from "@/api/globals";

/**
 * 前端已知权限名联合:从后端 OpenAPI 契约经 `gen:api` 生成(`MeSchema.permissions` 用
 * `z.enum(allPermissionNames)`,前端 `Me["permissions"]` 元素即字面量 union)。
 *
 * 后端是权限名单单一事实源(permissions-catalog 各 feature 汇总),前端不再维护第二份手写名单,
 * 前后端零漂移。后端新增/改名权限只需 `gen:api` 重生,本 union 同步更新。
 *
 * 放在 `src/types/`(非 eslint boundaries element type,不受依赖约束),以便 `lib/`(lib→api 禁)
 * 能经此约定的 `AppPermission` 间接消费后端契约。
 */
export type AppPermission = NonNullable<Me["permissions"]>[number];
