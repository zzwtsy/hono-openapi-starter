import type { PermissionDefinition } from "@/core/auth/permissions.js";

/**
 * iam feature 权限定义:权限管理本身 + 用户身份生命周期。
 *
 * **iam.*** - 组织/角色/授权/权限目录:
 * - iam.read:查询组织/角色/授权/权限目录
 * - organizations.manage:管理组织(建/改/删)
 * - roles.manage:管理角色与角色权限挂载
 * - assignments.manage:授/撤用户角色与直接权限
 *
 * **users.*** - 用户身份生命周期(细粒度,对齐 projects.* 范式,不塞进 manage):
 * - users.read:列出子树用户
 * - users.create:管理员代创建用户
 * - users.update:改 name/email
 * - users.reset-password:重置密码
 * - users.disable / users.enable:禁用·启用
 *
 * admin 角色(代码同步)含全部权限。第一版全局 admin:根组织 admin 对任意子组织
 * 检查通过(祖先遍历)。分级管理员(对目标 org 二次检查)留后续。
 */
export const iamPermissions = [
  { name: "iam.read", description: "查看权限管理信息" },
  { name: "organizations.manage", description: "管理组织(建/改/删)" },
  { name: "roles.manage", description: "管理角色与角色权限挂载" },
  { name: "assignments.manage", description: "授/撤用户角色与直接权限" },
  { name: "users.read", description: "查看用户" },
  { name: "users.create", description: "创建用户" },
  { name: "users.update", description: "修改用户资料" },
  { name: "users.reset-password", description: "重置用户密码" },
  { name: "users.disable", description: "禁用用户" },
  { name: "users.enable", description: "启用用户" },
] as const satisfies readonly PermissionDefinition[];

export type IamPermission = (typeof iamPermissions)[number]["name"];

// 类型层:把本 feature 的权限名 push 到 core 的 AppPermissionRegistry(declaration merging)。
// core 不 import 本文件,但 requirePermission(perm: AppPermission) 能据此编译期校验漏登记。
declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    "iam.read": true;
    "organizations.manage": true;
    "roles.manage": true;
    "assignments.manage": true;
    "users.read": true;
    "users.create": true;
    "users.update": true;
    "users.reset-password": true;
    "users.disable": true;
    "users.enable": true;
  }
}
