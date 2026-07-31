import type { AppBindings } from "../http/context.js";

import type { AuditContext } from "./context.js";

import { createMiddleware } from "hono/factory";
import { getRemoteAddress } from "../logger/fields.js";
import { runWithAuditContext } from "./context.js";

/**
 * 全局审计上下文中间件:开启 ALS 上下文,注入 ip/ua/requestId。
 *
 * 挂在 `requestIdMiddleware` 之后(依赖 requestId)、`permissionCacheMiddleware` 之后
 * (两个 ALS 互不干扰,不同 AsyncLocalStorage 实例)。
 * actorUserId/actorOrgId 由 `requireAuth` 认证成功后调 `setAuditContext` 补充。
 */
export function auditContextMiddleware() {
  return createMiddleware<AppBindings>(async (c, next) => {
    const context: AuditContext = {
      actorUserId: null,
      actorOrgId: null,
      actorRoleSnapshot: null,
      actorNameSnapshot: null,
      ipAddress: getRemoteAddress(c.req.raw),
      userAgent: c.req.header("user-agent") ?? undefined,
      requestId: c.get("requestId"),
    };

    await runWithAuditContext(context, async () => {
      await next();
    });
  });
}
