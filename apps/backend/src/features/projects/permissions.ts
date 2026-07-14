import type { PermissionDefinition } from "@/core/auth/permissions.js";

/**
 * projects feature 权限定义(单一来源:类型与运行时同源)。
 *
 * `as const` 保留字面量类型(`"projects.read"` 而非 `string`),`satisfies` 编译期校验每项
 * 结构合法(name 符合 `<resource>.<action>`)但不拓宽类型。`permissions-catalog.ts` 汇总此数组,
 * `syncAuthorizationCatalog` 据此同步进 DB。
 *
 * 读/写分离:`projects.read` 列表与详情;`projects.create`/`update`/`delete` 写操作,
 * 路由层 `requirePermission` 分别校验,最小权限粒度。
 */
export const projectPermissions = [
  { name: "projects.read", description: "查看项目" },
  { name: "projects.create", description: "创建项目" },
  { name: "projects.update", description: "修改项目" },
  { name: "projects.delete", description: "删除项目" },
] as const satisfies readonly PermissionDefinition[];

export type ProjectPermission = (typeof projectPermissions)[number]["name"];

// 类型层:把本 feature 的权限名 push 到 core 的 AppPermissionRegistry(declaration merging)。
// core 不 import 本文件,但 requirePermission(perm: AppPermission) 能据此编译期校验漏登记。
declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    "projects.read": true;
    "projects.create": true;
    "projects.update": true;
    "projects.delete": true;
  }
}
