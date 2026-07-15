import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth-layout";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

// 公开注册页:已登录 -> /dashboard;关闭注册时 BA hooks 返回错误,表单 Alert 展示。
export const Route = createFileRoute("/register")({
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Register,
});

function Register() {
  return (
    <AuthLayout title="注册" description="创建账号后可登录控制台（需管理员开启注册）">
      <RegisterForm />
    </AuthLayout>
  );
}
