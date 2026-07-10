import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  // 真实 session 在 App.tsx 通过 <RouterProvider context> 注入(React-land)
  context: { auth: { session: null } },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
