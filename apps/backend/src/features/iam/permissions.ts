import type { PermissionDefinition } from "@/core/auth/permissions.js";

/**
 * iam feature 权限定义:权限管理本身的管理权限。
 *
 * - iam.read:查询组织/角色/授权/权限目录
 * - iam.manage:管理(建/改/删)组织/角色/授权
 *
 * admin 角色(代码同步)含全部权限,包括这两个。第一版全局 admin:根组织 admin 对任意子组织
 * `iam.manage` 通过(祖先遍历)。分级管理员(对目标 org 二次检查)留后续。
 */
export const iamPermissions = [
  { name: "iam.read", description: "查看权限管理信息" },
  { name: "iam.manage", description: "管理组织/角色/授权" },
] as const satisfies readonly PermissionDefinition[];

export type IamPermission = (typeof iamPermissions)[number]["name"];

// 类型层:把本 feature 的权限名 push 到 core 的 AppPermissionRegistry(declaration merging)。
// core 不 import 本文件,但 requirePermission(perm: AppPermission) 能据此编译期校验漏登记。
declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    "iam.read": true;
    "iam.manage": true;
  }
}
