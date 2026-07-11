import type { GetMeRoute } from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { successResponse } from "@/core/http/response.js";
import { toAppPermissions } from "@/permissions-catalog.js";

/** 获取当前用户信息与有效权限。me 只需认证,不需 iam.* 权限(看自己)。 */
export const getMeHandler: AppRouteHandler<GetMeRoute> = async (c) => {
  const user = c.get("user");
  // requireAuth 应已跑并注入 user;me 未挂 requirePermission,防御性自防(与 require-permission 一致)
  if (!user) {
    throw new AppError("COMMON_UNAUTHORIZED");
  }
  // 未绑定组织时 permissions 为空(不抛 403,me 语义是"看自己")
  const orgId = user.orgId;
  const effective = orgId != null ? await PermissionService.listEffectivePermissions(user.id, orgId) : [];
  // 把 string[] 收窄到 AppPermission[]:满足 z.enum(allPermissionNames) 契约,脏数据防御性过滤。
  const permissions = toAppPermissions(effective);

  return successResponse(c, {
    user: { id: user.id, name: user.name, email: user.email, orgId: user.orgId ?? null },
    permissions,
  });
};
