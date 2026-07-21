import type { PermissionDefinition } from "@/core/auth/permissions.js";

/**
 * iam feature 权限定义:权限目录 + 组织/角色/授权管理 + 用户身份生命周期。
 *
 * resource 必须是业务实体(permissions/roles/organizations/assignments/users),
 * action 必须是细粒度 verb;聚合靠 role,不靠 permission name 里的 manage。
 */
export const iamPermissions = [
  // 权限目录
  { name: "permissions.read", description: "查看权限目录" },
  // 组织
  { name: "organizations.read", description: "查看组织" },
  { name: "organizations.create", description: "创建组织" },
  { name: "organizations.update", description: "修改组织" },
  { name: "organizations.delete", description: "删除组织" },
  // 角色
  { name: "roles.read", description: "查看角色" },
  { name: "roles.create", description: "创建角色" },
  { name: "roles.update", description: "修改角色" },
  { name: "roles.delete", description: "删除角色" },
  { name: "roles.assign-permissions", description: "给角色分配权限" },
  { name: "roles.revoke-permissions", description: "撤销角色权限" },
  // 授权
  { name: "assignments.read", description: "查看用户授权" },
  { name: "assignments.grant", description: "授予用户角色或直接权限" },
  { name: "assignments.revoke", description: "撤销用户角色或直接权限" },
  // 用户身份生命周期
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
    "permissions.read": true;
    "organizations.read": true;
    "organizations.create": true;
    "organizations.update": true;
    "organizations.delete": true;
    "roles.read": true;
    "roles.create": true;
    "roles.update": true;
    "roles.delete": true;
    "roles.assign-permissions": true;
    "roles.revoke-permissions": true;
    "assignments.read": true;
    "assignments.grant": true;
    "assignments.revoke": true;
    "users.read": true;
    "users.create": true;
    "users.update": true;
    "users.reset-password": true;
    "users.disable": true;
    "users.enable": true;
  }
}
