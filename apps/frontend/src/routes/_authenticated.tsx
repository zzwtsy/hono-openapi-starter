import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { useLogout } from "@/features/auth/model/hooks";
import Apis from "@/shared/api";

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
    // session 在手,取 permissions;cacheFor 5min 在 api/index.ts $$userConfigMap 集中配置,此处纯调用命中 cache
    const me = await Apis.Me.getMe();
    return {
      auth: { ...context.auth, user: me.user, permissions: me.permissions },
    };
  },
  component: AuthenticatedRoute,
});

function AuthenticatedRoute() {
  const { logout } = useLogout();
  return (
    <AuthenticatedLayout
      onLogout={() => {
        void logout();
      }}
    />
  );
}
