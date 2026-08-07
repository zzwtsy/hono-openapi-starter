import type { AppBindings } from "../http/context.js";

import { OpenAPIHono } from "@hono/zod-openapi";
import { formatZodError } from "../errors/zod-error.js";
import { errorResponse } from "../http/response.js";

import { createErrorLogFields, getRemoteAddress } from "../logger/fields.js";

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    // OpenAPI/Zod 校验失败统一转成业务错误 envelope，保持 route handler 只处理已校验输入。
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }

      const isPermissionCodeValidation = result.error.issues.some(issue =>
        issue.path.some(segment => segment === "permissionCode" || segment === "permissionCodes"),
      );
      const errorCode = isPermissionCodeValidation ? "PERMISSION_CODE_INVALID" : "COMMON_VALIDATION_FAILED";
      const statusCode = isPermissionCodeValidation ? 400 : 422;

      // validation 错误不走 app.onError（hook 返回 response 是 @hono/zod-openapi 的设计），
      // 需在此补一条结构化日志，保留字段级失败上下文（details），保证 requestId 全链路可检索。
      c.var.logger
        .withMetadata(
          createErrorLogFields(result.error, {
            requestId: c.get("requestId"),
            req: {
              method: c.req.method,
              url: c.req.path,
              remoteAddress: getRemoteAddress(c.req.raw),
            },
            res: {
              statusCode,
            },
          }, { code: errorCode, details: formatZodError(result.error), type: "validation" }),
        )
        .withError(result.error)
        .warn("validation failed");

      return errorResponse(c, errorCode, {
        details: formatZodError(result.error),
        type: "validation",
      });
    },
  });
}
