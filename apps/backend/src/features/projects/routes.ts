import { createRoute, z } from "@hono/zod-openapi";

import { audit } from "@/core/audit/index.js";
import { requireOrgUser } from "@/core/auth/context.js";
import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { projectAuditActions } from "./audit-actions.js";
import { CreateProjectSchema, ProjectIdParamSchema, ProjectSchema, UpdateProjectSchema } from "./schemas.js";
import { ProjectService } from "./service.js";

/** projects feature 共享:认证中间件链 + OpenAPI security + 401/403 响应,避免两条路由重复。 */
const projectsReadMiddleware = [requireAuth(), requirePermission("projects.read")];
const authErrorResponses = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  403: jsonErrorResponse("无权限", "COMMON_FORBIDDEN"),
};

export const listProjectsRoute = createRoute({
  method: "get",
  path: "/projects",
  tags: ["Projects"],
  operationId: "listProjects",
  summary: "列出项目",
  description: "返回当前用户所属组织下的所有项目。需 projects.read。",
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
  description: "根据项目 ID 获取项目详情。",
  middleware: projectsReadMiddleware,
  security: authedSecurity,
  request: {
    params: ProjectIdParamSchema,
  },
  responses: {
    200: jsonSuccessResponse(ProjectSchema, "项目详情"),
    ...authErrorResponses,
    404: jsonErrorResponse("项目不存在", "PROJECT_NOT_FOUND"),
  },
});

export const createProjectRoute = createRoute({
  method: "post",
  path: "/projects",
  tags: ["Projects"],
  operationId: "createProject",
  summary: "创建项目",
  description: "在当前用户所属组织下创建项目。同组织内项目名唯一。需 projects.create。",
  middleware: [requireAuth(), requirePermission("projects.create"), audit({
    action: projectAuditActions.create,
    resourceType: "project",
    resourceId: async (c) => {
      const body = await c.res.clone().json() as { data?: { id?: string } };
      return body.data?.id ?? "";
    },
    after: "response",
  })],
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateProjectSchema } } } },
  responses: {
    200: jsonSuccessResponse(ProjectSchema, "创建成功"),
    ...authErrorResponses,
    409: jsonErrorResponse("项目名已存在", "PROJECT_NAME_CONFLICT"),
  },
});

export const updateProjectRoute = createRoute({
  method: "patch",
  path: "/projects/{projectId}",
  tags: ["Projects"],
  operationId: "updateProject",
  summary: "修改项目",
  description: "修改项目名称或描述。同组织内项目名唯一。需 projects.update。",
  middleware: [requireAuth(), requirePermission("projects.update"), audit({
    action: projectAuditActions.update,
    resourceType: "project",
    resourceId: c => c.req.param("projectId") ?? "",
    before: async (c) => {
      const { orgId } = requireOrgUser(c);
      return ProjectService.getById(c.req.param("projectId") ?? "", orgId);
    },
    after: "response",
  })],
  security: authedSecurity,
  request: {
    params: ProjectIdParamSchema,
    body: { content: { "application/json": { schema: UpdateProjectSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(ProjectSchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("项目不存在", "PROJECT_NOT_FOUND"),
    409: jsonErrorResponse("项目名已存在", "PROJECT_NAME_CONFLICT"),
  },
});

export const deleteProjectRoute = createRoute({
  method: "delete",
  path: "/projects/{projectId}",
  tags: ["Projects"],
  operationId: "deleteProject",
  summary: "删除项目",
  description: "删除项目。需 projects.delete。",
  middleware: [requireAuth(), requirePermission("projects.delete"), audit({
    action: projectAuditActions.delete,
    resourceType: "project",
    resourceId: c => c.req.param("projectId") ?? "",
    before: async (c) => {
      const { orgId } = requireOrgUser(c);
      return ProjectService.getById(c.req.param("projectId") ?? "", orgId);
    },
    after: async () => null,
  })],
  security: authedSecurity,
  request: { params: ProjectIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.object({ id: z.string() }), "删除成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("项目不存在", "PROJECT_NOT_FOUND"),
  },
});

export type ListProjectsRoute = typeof listProjectsRoute;
export type GetProjectRoute = typeof getProjectRoute;
export type CreateProjectRoute = typeof createProjectRoute;
export type UpdateProjectRoute = typeof updateProjectRoute;
export type DeleteProjectRoute = typeof deleteProjectRoute;
