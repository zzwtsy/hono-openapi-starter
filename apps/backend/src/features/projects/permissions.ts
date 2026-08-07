import { definePermissionCatalog } from "@/core/auth/permissions.js";

/** projects feature 的权限目录；code 由 resource/action builder 自动生成。 */
export const projectPermissions = definePermissionCatalog({
  projects: {
    label: "项目",
    actions: {
      read: "查看项目",
      create: "创建项目",
      update: "修改项目",
      delete: "删除项目",
    },
  },
});

export type ProjectPermissionCode = (typeof projectPermissions)[number]["code"];

declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    projects: typeof projectPermissions;
  }
}
