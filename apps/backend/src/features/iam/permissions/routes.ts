import { createRoute, z } from "@hono/zod-openapi";

import { jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { PermissionSchema } from "../schemas.js";
import { authErrorResponses, permissionsReadMiddleware } from "../shared/route-helpers.js";

export const listPermissionsRoute = createRoute({
  method: "get",
  path: "/permissions",
  tags: ["IAM"],
  operationId: "listPermissions",
  summary: "列出权限",
  description: "返回权限目录,供管理端建角色时选择。需 permissions.read。",
  middleware: permissionsReadMiddleware,
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(PermissionSchema), "权限列表"),
    ...authErrorResponses,
  },
});

export type ListPermissionsRoute = typeof listPermissionsRoute;
