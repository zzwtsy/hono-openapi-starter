import type { PermissionDefinition } from "@/core/auth/permissions.js";

/**
 * system-settings feature 权限定义(单一来源:类型与运行时同源)。
 *
 * 读/写分离:`settings.read` 查看配置;`settings.update` 修改配置(upsert)。
 */
export const systemSettingPermissions = [
  { name: "settings.read", description: "查看系统设置" },
  { name: "settings.update", description: "修改系统设置" },
] as const satisfies readonly PermissionDefinition[];

export type SystemSettingPermission = (typeof systemSettingPermissions)[number]["name"];

// 类型层:把本 feature 的权限名 push 到 core 的 AppPermissionRegistry(declaration merging)。
declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    "settings.read": true;
    "settings.update": true;
  }
}
