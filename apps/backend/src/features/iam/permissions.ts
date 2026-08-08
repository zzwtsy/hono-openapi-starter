import { definePermissionCatalog } from "@/core/auth/permissions.js";

/** IAM feature 的权限目录；code 由 resource/action builder 自动生成。 */
export const iamPermissions = definePermissionCatalog({
  permissions: {
    label: "权限目录",
    actions: { read: "查看权限目录" },
  },
  organizations: {
    label: "组织",
    actions: {
      read: "查看组织",
      create: "创建组织",
      update: "修改组织",
      delete: "删除组织",
    },
  },
  roles: {
    label: "角色",
    actions: {
      "read": "查看角色",
      "create": "创建角色",
      "update": "修改角色",
      "delete": "删除角色",
      "assign-permissions": "给角色分配权限",
      "revoke-permissions": "撤销角色权限",
    },
  },
  assignments: {
    label: "授权",
    actions: {
      read: "查看用户授权",
      grant: "授予用户角色或直接权限",
      revoke: "撤销用户角色或直接权限",
    },
  },
  users: {
    label: "用户",
    actions: {
      "read": "查看用户",
      "create": "创建用户",
      "update": "修改用户资料",
      "reset-password": "重置用户密码",
      "disable": "禁用用户",
      "enable": "启用用户",
    },
  },
});

export type IamPermissionCode = (typeof iamPermissions)[number]["code"];

declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    iam: typeof iamPermissions;
  }
}
