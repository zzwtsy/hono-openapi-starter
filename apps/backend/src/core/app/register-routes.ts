import type { AppOpenAPI } from "./create-router.js";

import healthRouter from "@/features/health/index.js";

/**
 * 注册业务 feature 路由到统一前缀。
 *
 * 各 feature 导出自己的子 app（`createRouter().openapi(...)`），
 * 这里挂到 `/api/v1`。新增 feature 时在此追加一行 `app.route`。
 */
export function registerRoutes(app: AppOpenAPI) {
  app.route("/api/v1", healthRouter);
}
