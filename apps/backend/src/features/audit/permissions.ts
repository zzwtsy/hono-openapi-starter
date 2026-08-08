import { definePermissionCatalog } from "@/core/auth/permissions.js";

/** audit feature 的权限目录；code 由 resource/action builder 自动生成。 */
export const auditPermissions = definePermissionCatalog({
  audit: {
    label: "操作日志",
    actions: { read: "查看操作日志" },
  },
});

export type AuditPermissionCode = (typeof auditPermissions)[number]["code"];

declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    audit: typeof auditPermissions;
  }
}
