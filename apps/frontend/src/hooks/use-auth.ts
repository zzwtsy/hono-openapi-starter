import type { AuthState } from "@/types/auth";
import { useRouteContext } from "@tanstack/react-router";

/**
 * 读取 router context 的 auth 切片(session/user/permissions)。
 *
 * 用于侧边栏等需要 user 信息的组件;仅需权限判断的组件用 `usePermissions`(取 permissions
 * 切片,user 变更不触发其重绘)。公开路由(/login、/403)下 auth 为 undefined。
 */
export function useAuth(): AuthState | undefined {
  return useRouteContext({ strict: false, select: c => c.auth });
}
