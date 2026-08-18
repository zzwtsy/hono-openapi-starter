import type { Me } from "@/api/globals";
import type { Session } from "@/lib/auth-client";
import type { PermissionCode } from "@/types/permissions";

/**
 * router context 的 auth 切片，供 router context、layout 与 hooks 跨层共享。
 * - session:来自 Better Auth useSession(React-land 注入到 RouterProvider context)。
 * - user/permissionCodes:经 `_authenticated.beforeLoad` 由 getMe 填充后下钻;公开路由下为 undefined。
 * - permissionCodes 为后端契约生成的 PermissionCode union(经 gen:api),非松散 string[]。
 */
export interface AuthState {
  session: Session | null;
  user?: Me["user"];
  /** 经 `_authenticated.beforeLoad` 由 getMe 填充后下钻;公开路由下为 undefined。 */
  permissionCodes?: PermissionCode[];
  /** Home org 是否为系统根；仅供全局角色管理入口做 UX 门控。 */
  isSystemRootUser?: boolean;
}
