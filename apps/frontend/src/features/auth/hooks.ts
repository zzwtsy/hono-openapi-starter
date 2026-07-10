import { useRouter } from "@tanstack/react-router";
import { signIn, signOut } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";

// 登录:signIn 成功后 navigate 到回跳目标(或 /dashboard),触发 _authenticated beforeLoad 取 permissions。
// 登出:signOut 后 invalidate 重走守卫(session 变 null -> _authenticated 重定向 /login)。
export function useLogin() {
  const router = useRouter();
  return {
    login: async (email: string, password: string, redirectTo?: string) => {
      const { error } = await signIn.email({ email, password });
      if (error) {
        throw new Error(error.message ?? "登录失败");
      }
      await router.navigate({ to: safeRedirect(redirectTo) });
    },
  };
}

export function useLogout() {
  const router = useRouter();
  return {
    logout: async () => {
      await signOut();
      await router.invalidate();
    },
  };
}
