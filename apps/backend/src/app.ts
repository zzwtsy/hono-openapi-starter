import { createApp } from "./core/app/create-app.js";
import { configureOpenApi } from "./core/app/openapi.js";
import { registerRoutes } from "./core/app/register-routes.js";

// 组装主 app：创建（挂全局中间件）→ 注册 feature 路由 → 配置 OpenAPI 文档。
// 顺序固定：全局中间件必须在 app.route 之前注册，否则不作用于子路由（Hono 按注册顺序派发）。
const app = createApp();
registerRoutes(app);
configureOpenApi(app);

export { app };
