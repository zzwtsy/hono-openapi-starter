import type { GetMyAuthorizationRoute } from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { toPermissionRefs } from "@/catalogs/permissions.js";
import { AppError } from "@/core/errors/app-error.js";
import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const getMyAuthorizationHandler: AppRouteHandler<GetMyAuthorizationRoute> = async (c) => {
  // requireAuth 已在 route middleware 中保证 user 存在。
  const user = c.get("user")!;
  if (user.orgId == null) {
    throw new AppError("COMMON_INTERNAL_ERROR");
  }
  const result = await IamService.getMyAuthorization(user.id, user.orgId);
  return successResponse(c, {
    orgId: result.orgId,
    roles: result.roles,
    directPermissions: result.directPermissions,
    effective: {
      effective: result.effective.effective.map(item => ({
        permission: toPermissionRefs([item.permissionCode])[0],
        sources: item.sources,
      })),
      denied: result.effective.denied.map(item => ({
        permission: toPermissionRefs([item.permissionCode])[0],
        deniedBy: item.deniedBy,
        suppressedSources: item.suppressedSources,
      })),
    },
  });
};
