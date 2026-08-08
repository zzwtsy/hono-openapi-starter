import type { PermissionCode } from "@/types/permissions";
import { redirect } from "@tanstack/react-router";
import { hasPermission } from "@/lib/permissions";

// 前端权限守卫:只做 UX(隐藏/挡路由),后端 PermissionChecker 才是授权边界。
// 在路由 beforeLoad 调用:requirePermission(context.auth.permissionCodes, "roles.read")。
// required 为 PermissionCode(后端契约生成):拼错或漏登记编译期即 tsc 报错。
export function requirePermission(
  permissionCodes: readonly PermissionCode[] | undefined,
  required: PermissionCode,
): void {
  if (!hasPermission(permissionCodes, required)) {
    throw redirect({ to: "/403" });
  }
}
