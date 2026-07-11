import type { Me } from "@/api/globals";
import type { Session } from "@/lib/auth-client";
import type { AppPermission } from "@/types/permissions";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// router context:session 来自 Better Auth useSession(React-land 注入);
// user/permissions 在 _authenticated beforeLoad 由 getMe 填充,下钻给子路由。
// permissions 为后端契约生成的 AppPermission union(经 gen:api),非松散 string[]。
export interface AuthState {
  session: Session | null;
  user?: Me["user"];
  /** 经 `_authenticated.beforeLoad` 由 getMe 填充后下钻;公开路由下为 undefined。 */
  permissions?: AppPermission[];
}

export const Route = createRootRouteWithContext<{ auth: AuthState }>()({
  component: RootComponent,
  errorComponent: ({ error }) => (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>页面加载失败</CardTitle>
          <CardDescription>路由或数据加载出错</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{String(error)}</p>
          <Button onClick={() => window.location.reload()}>刷新</Button>
        </CardContent>
      </Card>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>404</CardTitle>
          <CardDescription>页面不存在</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link to="/dashboard" />}>返回首页</Button>
        </CardContent>
      </Card>
    </div>
  ),
});

function RootComponent() {
  // 根布局:仅 Outlet。受保护区 Sidebar 布局在 _authenticated;公开路由(/login、/403)裸渲染。
  return <Outlet />;
}
