import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";

// 登录:signIn 成功后 session 异步变 truthy(App 重渲染 -> RouterProvider context 更新),
// 但 await signIn 不等 store 真正更新;直接 navigate 会让 _authenticated beforeLoad 抢跑读到
// stale session=null -> redirect 回 /login。改用 effect 监听 session 变 truthy 后再 navigate
// (与 useLogout 对称:useLogout 监听 session 变 null,useLogin 监听变 truthy)。
export function useLogin() {
  const router = useRouter();
  const { data: session } = useSession();
  const pendingRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    // session 从 null 变 truthy:App 已重渲染、router.context 已是登录态;此时 navigate,
    // _authenticated beforeLoad 读到的 context 已有 session,不会弹回 /login。
    if (pendingRedirectRef.current !== null && session) {
      const target = pendingRedirectRef.current;
      pendingRedirectRef.current = null;
      void router.navigate({ to: safeRedirect(target) });
    }
  }, [session, router]);

  return {
    login: async (email: string, password: string, redirectTo?: string) => {
      const { error } = await signIn.email({ email, password });
      if (error) {
        throw new Error(error.message ?? "登录失败");
      }
      pendingRedirectRef.current = redirectTo ?? "";
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
