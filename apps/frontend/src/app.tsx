import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { useSession } from "./shared/lib/auth-client";

// App:等 session resolve 再渲染路由,避免 beforeLoad 拿到未 resolve 的 session。
export function App() {
  const { data: session, isPending } = useSession();
  if (isPending) {
    return null;
  }
  return <RouterProvider router={router} context={{ auth: { session } }} />;
}
