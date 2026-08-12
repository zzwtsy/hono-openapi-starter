import { createApp } from "@/core/app/create-app.js";
import { configureOpenApi } from "@/core/app/openapi.js";
import { registerAuthRoute } from "@/core/app/register-routes.js";
import { setPermissionChecker } from "@/core/authorization/index.js";
import { IamPermissionChecker } from "@/features/iam/index.js";
import { registerAuditPolicies } from "./audit-policies.js";
import { registerFeatureRoutes } from "./register-features.js";

/** 创建 HTTP application；不启动 server、timer，也不注册进程信号。 */
export function createApplication() {
  setPermissionChecker(new IamPermissionChecker());
  registerAuditPolicies();

  const app = createApp();
  registerAuthRoute(app);
  registerFeatureRoutes(app);
  configureOpenApi(app);
  return app;
}

/** 可被 contract/integration test 安全导入的 HTTP application 单例。 */
export const app = createApplication();
