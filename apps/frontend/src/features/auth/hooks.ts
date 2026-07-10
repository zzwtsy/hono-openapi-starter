import { useRouter } from "@tanstack/react-router";
import { signIn, signOut } from "@/lib/auth-client";

// 登录/登出后调 router.invalidate() 重走守卫(_authenticated beforeLoad 重新取 permissions)。
export function useLogin() {
  const router = useRouter();
  return {
    login: async (email: string, password: string) => {
      const { error } = await signIn.email({ email, password });
      if (error) {
        throw new Error(error.message ?? "登录失败");
      }
      await router.invalidate();
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
