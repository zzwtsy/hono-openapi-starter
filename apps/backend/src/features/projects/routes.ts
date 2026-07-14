import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { CreateProjectSchema, ProjectIdParamSchema, ProjectSchema, UpdateProjectSchema } from "./schemas.js";

/** projects feature 共享:认证中间件链 + OpenAPI security + 401/403 响应,避免两条路由重复。 */
const projectsReadMiddleware = [requireAuth(), requirePermission("projects.read")];
const authErrorResponses = {
  401: jsonErrorResponse("未认证"),
  403: jsonErrorResponse("无权限"),
};

export const listProjectsRoute = createRoute({
  method: "get",
  path: "/projects",
  tags: ["Projects"],
  operationId: "listProjects",
  summary: "列出当前用户组织下的项目",
  description: "返回当前用户所属组织(orgId)下的所有项目。需 projects.read 权限。",
  middleware: projectsReadMiddleware,
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(ProjectSchema), "项目列表"),
    ...authErrorResponses,
  },
});

export const getProjectRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}",
  tags: ["Projects"],
  operationId: "getProjectById",
  summary: "获取项目详情",
  description: "根据项目 ID 获取项目详情。项目不存在或不属于当前用户组织返回 404。",
  middleware: projectsReadMiddleware,
  security: authedSecurity,
  request: {
    params: ProjectIdParamSchema,
  },
  responses: {
    200: jsonSuccessResponse(ProjectSchema, "项目详情"),
    ...authErrorResponses,
    404: jsonErrorResponse("项目不存在"),
  },
});

export const createProjectRoute = createRoute({
  method: "post",
  path: "/projects",
  tags: ["Projects"],
  operationId: "createProject",
  summary: "创建项目",
  description: "在当前用户所属组织下创建项目。同组织内项目名唯一,重名返回 409。需 projects.create 权限。",
  middleware: [requireAuth(), requirePermission("projects.create")],
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateProjectSchema } } } },
  responses: {
    200: jsonSuccessResponse(ProjectSchema, "创建成功"),
    ...authErrorResponses,
    409: jsonErrorResponse("项目名已存在"),
  },
});

export const updateProjectRoute = createRoute({
  method: "patch",
  path: "/projects/{projectId}",
  tags: ["Projects"],
  operationId: "updateProject",
  summary: "修改项目",
  description: "修改项目名称或描述。项目不存在或不属于当前用户组织返回 404;同组织内改名重名返回 409。需 projects.update 权限。",
  middleware: [requireAuth(), requirePermission("projects.update")],
  security: authedSecurity,
  request: {
    params: ProjectIdParamSchema,
    body: { content: { "application/json": { schema: UpdateProjectSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(ProjectSchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("项目不存在"),
    409: jsonErrorResponse("项目名已存在"),
  },
});

export const deleteProjectRoute = createRoute({
  method: "delete",
  path: "/projects/{projectId}",
  tags: ["Projects"],
  operationId: "deleteProject",
  summary: "删除项目",
  description: "删除项目。项目不存在或不属于当前用户组织返回 404。需 projects.delete 权限。",
  middleware: [requireAuth(), requirePermission("projects.delete")],
  security: authedSecurity,
  request: { params: ProjectIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.object({ id: z.string() }), "删除成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("项目不存在"),
  },
});

export type ListProjectsRoute = typeof listProjectsRoute;
export type GetProjectRoute = typeof getProjectRoute;
export type CreateProjectRoute = typeof createProjectRoute;
export type UpdateProjectRoute = typeof updateProjectRoute;
export type DeleteProjectRoute = typeof deleteProjectRoute;
