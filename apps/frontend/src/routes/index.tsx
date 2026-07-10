import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // / -> /dashboard;_authenticated 守卫会在未登录时重定向到 /login
    throw redirect({ to: "/dashboard" });
  },
});
