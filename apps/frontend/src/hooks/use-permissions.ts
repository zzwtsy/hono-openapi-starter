import type { AppPermission } from "@/types/permissions";
import { useRouteContext } from "@tanstack/react-router";
import { hasPermission } from "@/lib/permissions";

/**
 * 单权限检查 hook:`useCan("roles.manage")` -> `boolean`。
 *
 * 鉴权走 TanStack Router context(非 React Context),`useRouteContext({ strict: false })`
 * 返回合并根 context 形状 `{ auth: AuthState }`(经 `router.tsx` 的 `Register` 注册类型)。
 * 必须在 `_authenticated` layout 内渲染的组件调用:此时 `context.auth.permissions` 已由
 * `_authenticated.beforeLoad` 填充;公开路由(/login、/403)auth.permissions 为 undefined -> 返回 false。
 *
 * `select: c => c.auth` 仅取 auth 切片,避免无关 context 变更触发重绘(配合结构共享)。
 */
export function useCan(perm: AppPermission): boolean {
  // strict: false 取合并根 context(经 router.tsx Register 注册);auth 在公开路由下可能为
  // undefined(AllContext 部分路由未填 auth),遂 select 直接返回 permissions(可能 undefined),
  // hasPermission 已接受 undefined(返回 false)——无需内联 null-handling。
  const permissions = useRouteContext({ strict: false, select: c => c.auth?.permissions });
  return hasPermission(permissions, perm);
}
