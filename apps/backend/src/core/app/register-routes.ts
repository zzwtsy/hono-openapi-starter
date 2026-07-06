import type { AppOpenAPI } from "./create-router.js";
import healthRouter from "@/features/health/index.js";

import { auth } from "../auth/index.js";

/**
 * 注册业务 feature 路由到统一前缀。
 *
 * `/api/auth/*` 由 Better Auth 原生 handler 处理,不包 envelope(ADR-0003)。
 * 各 feature 导出自己的子 app(`createRouter().openapi(...)`),挂到 `/api/v1`。
 * 新增 feature 时在此追加 `app.route`。
 */
export function registerRoutes(app: AppOpenAPI) {
  app.on(["POST", "GET"], "/api/auth/*", async c => auth.handler(c.req.raw));
  app.route("/api/v1", healthRouter);
}
