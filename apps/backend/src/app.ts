import { createApp } from "./core/app/create-app.js";
import { configureOpenApi } from "./core/app/openapi.js";
import { registerAuthRoute } from "./core/app/register-routes.js";
import { setPermissionChecker } from "./core/authorization/index.js";
import healthRouter, { healthzRouter } from "./features/health/index.js";
import iamRouter from "./features/iam/index.js";
import { IamPermissionChecker } from "./features/iam/permission-checker.js";
import meRouter from "./features/me/index.js";
import projectsRouter from "./features/projects/index.js";

// 装配权限检查 Adapter(Port/Adapter):IamPermissionChecker 提供递归 CTE 实现,
// core 的 PermissionService 经 holder 调用,不直接依赖 features(见 ADR-0004)。
setPermissionChecker(new IamPermissionChecker());

// 组装主 app:创建(挂全局中间件)-> 挂认证路由 + feature 路由 -> 配置 OpenAPI 文档。
// 顺序固定:全局中间件必须在 app.route 之前注册,否则不作用于子路由(Hono 按注册顺序派发)。
const app = createApp();
registerAuthRoute(app);
app.route("/", healthzRouter);
app.route("/api/v1", healthRouter);
app.route("/api/v1", meRouter);
app.route("/api/v1", projectsRouter);
app.route("/api/v1", iamRouter);
configureOpenApi(app);

export { app };
