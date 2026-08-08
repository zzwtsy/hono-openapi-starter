import type { PermissionCode } from "@/types/permissions";
import { useRouteContext } from "@tanstack/react-router";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions";

/**
 * 权限检查 hook:读 router context 的 `auth.permissionCodes`,返回布尔。
 *
 * 鉴权走 TanStack Router context(非 React Context),`useRouteContext({ strict: false })`
 * 返回合并根 context 形状 `{ auth: AuthState }`(经 `router.tsx` 的 `Register` 注册类型)。
 * 必须在 `_authenticated` layout 内渲染的组件调用:此时 `context.auth.permissionCodes` 已由
 * `_authenticated.beforeLoad` 填充;公开路由(/login、/403)auth.permissionCodes 为 undefined -> 返回 false。
 *
 * - `useCan(perm)`:持有单个权限。
 * - `useCanAny(perms)`:持有「任一」权限(OR),用于"任一写权限即可见操作列"这类聚合。
 * - `useCanAll(perms)`:持有「全部」权限(AND),用于"管理入口需配套读+写"这类复合门控。
 *
 * `select: c => c.auth?.permissionCodes` 仅取 permissionCodes 切片,避免无关 context 变更触发重绘(配合结构共享)。
 */

export function usePermissions(): readonly PermissionCode[] | undefined {
  return useRouteContext({ strict: false, select: c => c.auth?.permissionCodes });
}

export function useCan(perm: PermissionCode): boolean {
  return hasPermission(usePermissions(), perm);
}

export function useCanAny(perms: readonly PermissionCode[]): boolean {
  return hasAnyPermission(usePermissions(), perms);
}

export function useCanAll(perms: readonly PermissionCode[]): boolean {
  return hasAllPermissions(usePermissions(), perms);
}
