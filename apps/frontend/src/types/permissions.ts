import type { PermissionRef as ApiPermissionRef, Me } from "@/api/globals";

/**
 * 前端已知权限 code 联合:从后端 OpenAPI 契约经 `gen:api` 生成(`MeSchema.permissionCodes` 用
 * `z.enum(allPermissionCodes)`,前端 `Me["permissionCodes"]` 元素即字面量 union)。
 *
 * 后端是权限名单单一事实源(permissions-catalog 各 feature 汇总),前端不再维护第二份手写名单,
 * 前后端零漂移。后端新增/改名权限只需 `gen:api` 重生,本 union 同步更新。
 *
 * 放在 `src/types/`，作为 `lib` / `hooks` / `components` 消费生成契约的稳定类型入口；
 * ESLint 允许 types 以 type-only 方式依赖 api，展示组件仍直接消费生成的 PermissionRef。
 */
export type PermissionCode = Me["permissionCodes"][number];
export type PermissionRef = ApiPermissionRef;
