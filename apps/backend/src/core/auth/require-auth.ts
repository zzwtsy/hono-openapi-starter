import type { ILogLayer } from "loglayer";
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
    // userId 追加到请求级 logger context(appendContext 原地改 child logger 的 context manager,
    // 业务日志与 access log 用同一 childLogger 均带 userId)。不用 withContext():其 polymorphic this
    // 在 typescript-eslint 退化为 ILogLayer<any> 触发 ts/no-unsafe-argument。honoLogLayer 在生产全局
    // 注入 c.var.logger;未挂(如单元测试)时跳过,不影响认证。
    const requestLogger = c.get("logger") as ILogLayer | undefined;
    if (requestLogger != null) {
      requestLogger.getContextManager().appendContext({ userId: result.user.id });
    }
    await next();
  });
}
