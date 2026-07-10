import { RouterProvider } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";
import { router } from "./router";

export function App() {
  const { data: session, isPending } = useSession();
  // 等 session resolve 再渲染路由,避免 beforeLoad 拿到未 resolve 的 session
  if (isPending) {
    return <div className="p-6 text-muted-foreground">加载中...</div>;
  }
  return <RouterProvider router={router} context={{ auth: { session } }} />;
}

export default App;
