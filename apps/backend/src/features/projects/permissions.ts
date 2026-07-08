import type { PermissionDefinition } from "@/core/auth/permissions.js";

/**
 * projects feature 权限定义(单一来源:类型与运行时同源)。
 *
 * `as const` 保留字面量类型(`"projects.read"` 而非 `string`),`satisfies` 编译期校验每项
 * 结构合法(name 符合 `<resource>.<action>`)但不拓宽类型。`permissions-manifest.ts` 汇总此数组,
 * `syncAuthorizationCatalog` 据此同步进 DB。
 */
export const projectPermissions = [
  { name: "projects.read", description: "查看项目" },
] as const satisfies readonly PermissionDefinition[];

export type ProjectPermission = (typeof projectPermissions)[number]["name"];

// 类型层:把本 feature 的权限名 push 到 core 的 AppPermissionRegistry(declaration merging)。
// core 不 import 本文件,但 requirePermission(perm: AppPermission) 能据此编译期校验漏登记。
declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    "projects.read": true;
  }
}
