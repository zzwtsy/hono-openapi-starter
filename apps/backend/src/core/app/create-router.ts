import type { AppBindings } from "../http/context.js";

import { OpenAPIHono } from "@hono/zod-openapi";
import { formatZodError } from "../errors/zod-error.js";

import { errorResponse } from "../http/response.js";

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    // OpenAPI/Zod 校验失败统一转成业务错误 envelope，保持 route handler 只处理已校验输入。
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }

      return errorResponse(c, "COMMON_VALIDATION_FAILED", {
        details: formatZodError(result.error),
        type: "validation",
      });
    },
  });
}
