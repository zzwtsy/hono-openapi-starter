import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Apis from "@/api";

// 登录守卫 layout:无 session -> /login;有 -> getMe 取 permissions,下钻 context。
// 守卫不是授权边界,后端 PermissionChecker 才是(见 TanStack Router 认证文档)。
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    // session 在手,取 permissions(命中 alova cache,避免每路由重拉)
    const me = await Apis.Me.getMe();
    return {
      auth: { ...context.auth, user: me.user, permissions: me.permissions },
    };
  },
  component: () => <Outlet />,
});
