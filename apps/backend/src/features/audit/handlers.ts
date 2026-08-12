import type {
  ListAuditActionsRoute,
  ListAuditLogsByResourceRoute,
  ListAuditLogsRoute,
} from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";
import { resolveAuditActorOrgScope } from "@/core/audit/index.js";
import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { AuditService } from "./service.js";

/** 全局审计列表:取管理子树做 actorOrgIds 过滤。 */
export const listAuditLogsHandler: AppRouteHandler<ListAuditLogsRoute> = async (c) => {
  const query = c.req.valid("query");
  const { id: userId, orgId: organizationId } = requireOrgUser(c);
  const subtree = await resolveAuditActorOrgScope({ userId, organizationId });
  const result = await AuditService.list({ ...query, actorOrgIds: subtree });
  return successResponse(c, result);
};

/** by-resource 时间线:先校验资源可见性,再查。 */
export const listAuditLogsByResourceHandler: AppRouteHandler<ListAuditLogsByResourceRoute> = async (c) => {
  const query = c.req.valid("query");
  const { id: userId, orgId: organizationId } = requireOrgUser(c);
  await AuditService.checkResourceVisibility(
    { userId, organizationId },
    query.resourceType,
    query.resourceId,
  );
  const result = await AuditService.listByResource(query);
  return successResponse(c, result);
};

/** action 目录。 */
export const listAuditActionsHandler: AppRouteHandler<ListAuditActionsRoute> = async (c) => {
  const actions = await AuditService.listActions();
  return successResponse(c, actions);
};
