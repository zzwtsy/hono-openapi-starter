import type { EnsurePermissionName } from "@/core/auth/permissions.js";

/** projects feature 权限字面量 union。 */
export type ProjectPermission = EnsurePermissionName<"projects.read">;

declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    projects: ProjectPermission;
  }
}
