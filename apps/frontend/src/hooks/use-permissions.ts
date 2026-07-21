import type { AppPermission } from "@/types/permissions";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions";

/**
 * 权限检查 hook:读 router context 的 `auth.permissions`,返回布尔。
 *
 * 鉴权走 TanStack Router context(非 React Context),`useRouteContext({ strict: false })`
 * 返回合并根 context 形状 `{ auth: AuthState }`(经 `router.tsx` 的 `Register` 注册类型)。
 * 必须在 `_authenticated` layout 内渲染的组件调用:此时 `context.auth.permissions` 已由
 * `_authenticated.beforeLoad` 填充;公开路由(/login、/403)auth.permissions 为 undefined -> 返回 false。
 *
 * - `useCan(perm)`:持有单个权限。
 * - `useCanAny(perms)`:持有「任一」权限(OR),用于"任一写权限即可见操作列"这类聚合。
 * - `useCanAll(perms)`:持有「全部」权限(AND),用于"管理入口需配套读+写"这类复合门控。
 *
 * `select: c => c.auth?.permissions` 仅取 permissions 切片,避免无关 context 变更触发重绘(配合结构共享)。
 */

export function usePermissions(): readonly AppPermission[] | undefined {
  return useRouteContext({ strict: false, select: c => c.auth?.permissions });
}

export function useCan(perm: AppPermission): boolean {
  return hasPermission(usePermissions(), perm);
}

export function useCanAny(perms: readonly AppPermission[]): boolean {
  return hasAnyPermission(usePermissions(), perms);
}

export function useCanAll(perms: readonly AppPermission[]): boolean {
  return hasAllPermissions(usePermissions(), perms);
}

/**
 * 批量权限映射:一次读取权限,返回「每个权限是否持有」的布尔映射。
 *
 * 用于行操作菜单等需同时判多个动作的场景,替代多次 `useCan` 调用。直接消费扁平权限
 * 字符串(对齐 TanStack 官方 RBAC how-to 的 `hasPermission(string)` 模式),不拆
 * resource/action--批量查询与权限名格式正交,扁平 union 已有编译期校验。
 *
 * `permissions` 为 undefined(未登录/未加载)时,所有 key 返回 false。
 *
 * @example
 * const m = useCanMap(["projects.update", "projects.delete"] as const);
 * m["projects.update"]; // boolean
 */
export function useCanMap<const P extends readonly AppPermission[]>(
  perms: P,
): { [K in P[number]]: boolean } {
  const owned = usePermissions();
  return useMemo(() => {
    const set = new Set(owned);
    return Object.fromEntries(
      perms.map(p => [p, set.has(p)]),
    ) as { [K in P[number]]: boolean };
  }, [owned, perms]);
}
