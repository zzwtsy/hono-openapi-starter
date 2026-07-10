import { redirect } from "@tanstack/react-router";

// 前端权限守卫:只做 UX(隐藏/挡路由),后端 PermissionChecker 才是授权边界。
// 在路由 beforeLoad 调用:requirePermission(context.auth.permissions, "iam.read")。
export function requirePermission(permissions: string[] | undefined, required: string) {
  if (permissions?.includes(required) !== true) {
    throw redirect({ to: "/403" });
  }
}
