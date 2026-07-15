import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";

// 登录:signIn 成功后 navigate 到回跳目标(或 /dashboard),触发 _authenticated beforeLoad 取 permissions。
// 登出:signOut 后 session 异步变 null,但 await signOut/refetch 不等 store 真正清空,invalidate 会抢跑
// 看到 stale session(要两次退出)。改用 effect:signOut 后监听 useSession,session 真正变 null
// (render 之后,router.context 已更新)时 navigate /login,/login beforeLoad 不会弹回 /dashboard。
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

/** 自助注册:signUp.email 成功后跳 /login(管理员可关注册;关闭时 BA hooks 返回错误文案)。 */
export function useRegister() {
  const router = useRouter();
  return {
    register: async (input: { email: string; password: string; name: string }) => {
      const { error } = await signUp.email(input);
      if (error) {
        throw new Error(error.message ?? "注册失败");
      }
      await router.navigate({ to: "/login" });
    },
  };
}

export function useLogout() {
  const router = useRouter();
  const { data: session, refetch } = useSession();
  const loggingOutRef = useRef(false);

  useEffect(() => {
    // session 变 null 时 App 已重渲染、router.context 已是 null;effect 在 render 之后跑,
    // 此时 navigate /login,其 beforeLoad 读到的 context 已是 null,不会弹回 /dashboard。
    if (loggingOutRef.current && !session) {
      loggingOutRef.current = false;
      void router.navigate({ to: "/login" });
    }
  }, [session, router]);

  return {
    logout: async () => {
      loggingOutRef.current = true;
      await signOut();
      await refetch();
    },
  };
}
