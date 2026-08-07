import { definePermissionCatalog } from "@/core/auth/permissions.js";

/** system-settings feature 的权限目录；code 由 resource/action builder 自动生成。 */
export const systemSettingPermissions = definePermissionCatalog({
  settings: {
    label: "设置",
    actions: {
      read: "查看系统设置",
      update: "修改系统设置",
    },
  },
});

export type SystemSettingPermissionCode = (typeof systemSettingPermissions)[number]["code"];

declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    systemSettings: typeof systemSettingPermissions;
  }
}
