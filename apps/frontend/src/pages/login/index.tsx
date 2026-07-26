import { AuthLayout } from "@/components/layout/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";

export function LoginPage({ redirectTo }: { redirectTo?: string }) {
  return (
    <AuthLayout title="登录" description="使用邮箱和密码登录控制台">
      <LoginForm redirectTo={redirectTo} />
    </AuthLayout>
  );
}
