import type { AuthSession } from "./better-auth.js";

/** `requireAuth` 注入 Hono context 的 Better Auth session 变量。 */
export interface AuthVariables {
  user: AuthSession["user"];
  session: AuthSession["session"];
}
