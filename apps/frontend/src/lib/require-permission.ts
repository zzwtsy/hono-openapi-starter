import type { AppPermission } from "@/types/permissions";
import { redirect } from "@tanstack/react-router";
import { hasPermission } from "@/lib/permissions";

// 前端权限守卫:只做 UX(隐藏/挡路由),后端 PermissionChecker 才是授权边界。
// 在路由 beforeLoad 调用:requirePermission(context.auth.permissions, "iam.read")。
// required 为 AppPermission(后端契约生成):拼错或漏登记编译期即 tsc 报错。
export function requirePermission(
  permissions: readonly AppPermission[] | undefined,
  required: AppPermission,
): void {
  if (!hasPermission(permissions, required)) {
    throw redirect({ to: "/403" });
  }
}
