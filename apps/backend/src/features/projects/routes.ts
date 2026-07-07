import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { ProjectIdParamSchema, ProjectSchema } from "./schemas.js";

// 触发 module augmentation,让 requirePermission("projects.read") 类型合法
import "./permissions.js";

export const listProjectsRoute = createRoute({
  method: "get",
  path: "/projects",
  tags: ["Projects"],
  operationId: "listProjects",
  summary: "列出当前用户组织下的项目",
  description: "返回当前用户所属组织(orgId)下的所有项目。需 projects.read 权限。",
  middleware: [requireAuth(), requirePermission("projects.read")] as const,
  responses: {
    200: jsonSuccessResponse(z.array(ProjectSchema), "项目列表"),
    401: jsonErrorResponse("未认证"),
    403: jsonErrorResponse("无权限"),
  },
});

export const getProjectRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}",
  tags: ["Projects"],
  operationId: "getProjectById",
  summary: "获取项目详情",
  description: "根据项目 ID 获取项目详情。项目不存在或不属于当前用户组织返回 404。",
  middleware: [requireAuth(), requirePermission("projects.read")] as const,
  request: {
    params: ProjectIdParamSchema,
  },
  responses: {
    200: jsonSuccessResponse(ProjectSchema, "项目详情"),
    401: jsonErrorResponse("未认证"),
    403: jsonErrorResponse("无权限"),
    404: jsonErrorResponse("项目不存在"),
  },
});

export type ListProjectsRoute = typeof listProjectsRoute;
export type GetProjectRoute = typeof getProjectRoute;
