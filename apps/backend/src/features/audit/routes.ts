import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import {
  AuditActionSchema,
  AuditLogListSchema,
  AuditLogTimelineSchema,
  ListAuditLogsByResourceQuerySchema,
  ListAuditLogsQuerySchema,
} from "./schemas.js";

const authErrorResponses = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  403: jsonErrorResponse("无权限", "COMMON_FORBIDDEN"),
};

/** 全局审计列表(offset 分页 + 筛选,需 audit.read)。 */
export const listAuditLogsRoute = createRoute({
  method: "get",
  path: "/audit-logs",
  tags: ["Audit"],
  operationId: "listAuditLogs",
  summary: "审计日志列表",
  description: "返回审计日志列表(按操作者管理子树过滤)。需 audit.read。",
  middleware: [requireAuth(), requirePermission("audit.read")],
  security: authedSecurity,
  request: { query: ListAuditLogsQuerySchema },
  responses: {
    200: jsonSuccessResponse(AuditLogListSchema, "审计日志列表"),
    ...authErrorResponses,
  },
});

/** by-resource 时间线(cursor 分页,资源可见性校验)。 */
export const listAuditLogsByResourceRoute = createRoute({
  method: "get",
  path: "/audit-logs/by-resource",
  tags: ["Audit"],
  operationId: "listAuditLogsByResource",
  summary: "资源操作历史",
  description: "按资源查操作历史(时间线)。校验调用者对该资源的读权限,不需 audit.read。",
  middleware: [requireAuth()],
  security: authedSecurity,
  request: { query: ListAuditLogsByResourceQuerySchema },
  responses: {
    200: jsonSuccessResponse(AuditLogTimelineSchema, "资源操作历史"),
    ...authErrorResponses,
    404: jsonErrorResponses("资源不存在", ["COMMON_NOT_FOUND", "USER_NOT_FOUND", "PROJECT_NOT_FOUND"]),
  },
});

/** action 目录(前端渲染查表,需 audit.read)。 */
export const listAuditActionsRoute = createRoute({
  method: "get",
  path: "/audit-logs/actions",
  tags: ["Audit"],
  operationId: "listAuditActions",
  summary: "审计动作目录",
  description: "返回 action 代码与中文 label 映射,供前端渲染查表。需 audit.read。",
  middleware: [requireAuth(), requirePermission("audit.read")],
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(AuditActionSchema), "action 目录"),
    ...authErrorResponses,
  },
});

export type ListAuditLogsRoute = typeof listAuditLogsRoute;
export type ListAuditLogsByResourceRoute = typeof listAuditLogsByResourceRoute;
export type ListAuditActionsRoute = typeof listAuditActionsRoute;
