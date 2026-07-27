import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// createRouter:routeTree 来自 vite 插件自动生成。session 通过 <RouterProvider context>
// 在 React-land 注入(见 app.tsx),beforeLoad 读 context.auth.session。
export const router = createRouter({
  routeTree,
  context: { auth: { session: null } },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
