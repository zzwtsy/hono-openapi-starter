import type { PermissionDefinition } from "@/core/auth/permissions.js";

/**
 * audit feature 权限定义(单一来源:类型与运行时同源)。
 *
 * `audit.read` 控制全局审计页访问;业务页内嵌时间线走 by-resource 端点,
 * 靠资源可见性校验(有该业务 read 权限即可),不需 audit.read。
 */
export const auditPermissions = [
  { name: "audit.read", description: "查看操作日志" },
] as const satisfies readonly PermissionDefinition[];

export type AuditPermission = (typeof auditPermissions)[number]["name"];

// 类型层:把本 feature 的权限名 push 到 core 的 AppPermissionRegistry(declaration merging)。
declare module "@/core/auth/permissions.js" {
  interface AppPermissionRegistry {
    "audit.read": true;
  }
}
