import { createAuthClient } from "better-auth/react";
import { env } from "@/lib/env";

// Better Auth 客户端:同源访问(/api/auth 经 vite proxy -> 后端 3001),cookie 自动携带。
// useSession 管登录态;permissions 来自业务 me 端点(alova Apis.Me.getMe),不在此处。
export const authClient = createAuthClient({
  baseURL: env.VITE_API_BASE_URL || undefined,
  fetchOptions: { credentials: "include" },
});

export const { useSession, signIn, signOut } = authClient;

/** Better Auth session 类型(供 router context 复用)。 */
export type Session = NonNullable<ReturnType<typeof authClient.useSession>["data"]>;
