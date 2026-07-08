import type { AppOpenAPI } from "./create-router.js";

import { auth } from "../auth/index.js";

/**
 * 挂载认证原生路由(`/api/auth/*`,Better Auth handler,不包 envelope,见 ADR-0003)。
 * 业务 feature 路由由 `app.ts`(组装点)挂载,core/app 不 import features。
 */
export function registerAuthRoute(app: AppOpenAPI) {
  app.on(["POST", "GET"], "/api/auth/*", async c => auth.handler(c.req.raw));
}
