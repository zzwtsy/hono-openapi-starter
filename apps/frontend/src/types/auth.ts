import type { Me } from "@/api/globals";
import type { Session } from "@/lib/auth-client";
import type { AppPermission } from "@/types/permissions";

/**
 * router context 的 auth 切片:跨层共享类型(router context + layout + hooks)。
 *
 * 下沉到 types 层(此前定义在 routes/__root,迫使 layout 反向依赖 routes,违反边界)。
 * - session:来自 Better Auth useSession(React-land 注入到 RouterProvider context)。
 * - user/permissions:经 `_authenticated.beforeLoad` 由 getMe 填充后下钻;公开路由下为 undefined。
 * - permissions 为后端契约生成的 AppPermission union(经 gen:api),非松散 string[]。
 */
export interface AuthState {
  session: Session | null;
  user?: Me["user"];
  /** 经 `_authenticated.beforeLoad` 由 getMe 填充后下钻;公开路由下为 undefined。 */
  permissions?: AppPermission[];
}
