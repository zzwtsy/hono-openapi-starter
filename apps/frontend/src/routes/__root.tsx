import type { Me } from "@/api/globals";
import type { Session } from "@/lib/auth-client";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

// router context:session 来自 Better Auth useSession(React-land 注入);
// user/permissions 在 _authenticated beforeLoad 由 getMe 填充,下钻给子路由。
interface AuthState {
  session: Session | null;
  user?: Me["user"];
  permissions?: string[];
}

export const Route = createRootRouteWithContext<{ auth: AuthState }>()({
  component: () => <Outlet />,
});
