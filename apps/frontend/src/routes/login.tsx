import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth/components/LoginForm";

// 公开登录页:已登录 -> /dashboard;redirect 搜索参数供登录后回跳(见 features/auth/hooks useLogin)。
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  return <LoginForm redirectTo={redirect} />;
}
