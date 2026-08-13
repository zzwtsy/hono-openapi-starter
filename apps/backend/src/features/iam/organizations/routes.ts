import { createRoute, z } from "@hono/zod-openapi";

import { audit } from "@/core/audit/index.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { iamAuditActions } from "../audit-actions.js";
import {
  CreateOrganizationSchema,
  OrganizationIdParamSchema,
  OrganizationSchema,
  UpdateOrganizationSchema,
} from "../schemas.js";
import { IamService } from "../service.js";
import {
  authErrorResponses,
  organizationsCreateMiddleware,
  organizationsDeleteMiddleware,
  organizationsReadMiddleware,
  organizationsUpdateMiddleware,
} from "../shared/route-helpers.js";

export const listOrganizationsRoute = createRoute({
  method: "get",
  path: "/organizations",
  tags: ["IAM"],
  operationId: "listOrganizations",
  summary: "列出组织",
  description: "返回当前用户管理子树内组织(扁平,带 parentId,前端构建树)。需 organizations.read。",
  middleware: organizationsReadMiddleware,
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(OrganizationSchema), "组织列表"),
    ...authErrorResponses,
  },
});

export const createOrganizationRoute = createRoute({
  method: "post",
  path: "/organizations",
  tags: ["IAM"],
  operationId: "createOrganization",
  summary: "创建组织",
  description: "在指定父组织下创建子组织；系统根仅由 bootstrap/seed 创建。需在父组织具备 organizations.create。",
  middleware: [...organizationsCreateMiddleware, audit({
    action: iamAuditActions.orgCreate,
    resourceType: "org",
    resourceId: async (c) => {
      const body = await c.res.clone().json() as { data?: { id?: string } };
      return body.data?.id ?? "";
    },
    after: "response",
  })],
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateOrganizationSchema } } } },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "创建成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("父组织不存在", "ORG_NOT_FOUND"),
  },
});

export const getOrganizationRoute = createRoute({
  method: "get",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "getOrganization",
  summary: "获取组织详情",
  description: "根据组织 ID 获取组织详情。需 organizations.read。",
  middleware: organizationsReadMiddleware,
  security: authedSecurity,
  request: { params: OrganizationIdParamSchema },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "组织详情"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在", "ORG_NOT_FOUND"),
  },
});

export const updateOrganizationRoute = createRoute({
  method: "patch",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "updateOrganization",
  summary: "修改组织",
  description: "修改组织 name 或 parentId。系统根只能改名，改 parentId 时防环并校验当前与新父组织权限。",
  middleware: [...organizationsUpdateMiddleware, audit({
    action: iamAuditActions.orgUpdate,
    resourceType: "org",
    resourceId: c => c.req.param("orgId")!,
    before: async c => IamService.getOrganizationById(c.req.param("orgId")!),
    after: "response",
  })],
  security: authedSecurity,
  request: {
    params: OrganizationIdParamSchema,
    body: { content: { "application/json": { schema: UpdateOrganizationSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在", "ORG_NOT_FOUND"),
    409: jsonErrorResponse("会形成环", "ORG_CYCLE"),
  },
});

export const deleteOrganizationRoute = createRoute({
  method: "delete",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "deleteOrganization",
  summary: "删除组织",
  description: "删除非根组织。有子组织或有用户时拒绝删除。需在目标组织具备 organizations.delete。",
  middleware: [...organizationsDeleteMiddleware, audit({
    action: iamAuditActions.orgDelete,
    resourceType: "org",
    resourceId: c => c.req.param("orgId")!,
    before: async c => IamService.getOrganizationById(c.req.param("orgId")!),
    after: async () => null,
  })],
  security: authedSecurity,
  request: { params: OrganizationIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.object({ id: z.string() }), "删除成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在", "ORG_NOT_FOUND"),
    409: jsonErrorResponses("系统根不可删除，或组织仍有子组织/用户", ["ORG_ROOT_IMMUTABLE", "ORG_HAS_CHILDREN", "ORG_HAS_USERS"]),
  },
});

export type ListOrganizationsRoute = typeof listOrganizationsRoute;
export type CreateOrganizationRoute = typeof createOrganizationRoute;
export type GetOrganizationRoute = typeof getOrganizationRoute;
export type UpdateOrganizationRoute = typeof updateOrganizationRoute;
export type DeleteOrganizationRoute = typeof deleteOrganizationRoute;
