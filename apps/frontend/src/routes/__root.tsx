import type { Me } from "@/api/globals";
import type { Session } from "@/lib/auth-client";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// router context:session 来自 Better Auth useSession(React-land 注入);
// user/permissions 在 _authenticated beforeLoad 由 getMe 填充,下钻给子路由。
interface AuthState {
  session: Session | null;
  user?: Me["user"];
  permissions?: string[];
}

export const Route = createRootRouteWithContext<{ auth: AuthState }>()({
  component: RootComponent,
  errorComponent: ({ error }) => (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="max-w-md">
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
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>404</CardTitle>
          <CardDescription>页面不存在</CardDescription>
        </CardHeader>
      </Card>
    </div>
  ),
});

function RootComponent() {
  const { auth } = Route.useRouteContext();
  return (
    <div className="min-h-svh">
      <NavBar auth={auth} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
