import type { AppBindings } from "../http/context.js";

import { createMiddleware } from "hono/factory";
import { AppError } from "../errors/app-error.js";
import { getSession } from "./session.js";

/**
 * 认证中间件:校验 Better Auth session,未登录抛 `COMMON_UNAUTHORIZED`。
 * 成功则把 user/session 注入 Hono context,供后续 handler 读取。
 */
export function requireAuth() {
  return createMiddleware<AppBindings>(async (c, next) => {
    const result = await getSession(c.req.raw.headers);

    if (result?.user == null || result?.session == null) {
      throw new AppError("COMMON_UNAUTHORIZED");
    }

    c.set("user", result.user);
    c.set("session", result.session);
    await next();
  });
}
