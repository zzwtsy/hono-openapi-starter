import type { ChangeMyPasswordRoute, GetMeRoute, UpdateMeRoute } from "./routes.js";

import type { UserPermissionsResult } from "@/core/authorization/index.js";
import type { AppRouteHandler } from "@/core/http/context.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { successResponse } from "@/core/http/response.js";
import { toAppPermissions } from "@/permissions-catalog.js";
import { MeService } from "./service.js";

/** 获取当前用户信息与有效权限。me 只需认证,不需 iam.* 权限(看自己)。 */
export const getMeHandler: AppRouteHandler<GetMeRoute> = async (c) => {
  const user = c.get("user");
  // requireAuth 应已跑并注入 user;me 未挂 requirePermission,防御性自防(与 require-permission 一致)
  if (!user) {
    throw new AppError("COMMON_UNAUTHORIZED");
  }
  // 未绑定组织时 permissions 为空(不抛 403,me 语义是"看自己")
  const orgId = user.orgId;
  const result: UserPermissionsResult = orgId != null
    ? await PermissionService.listEffectivePermissions(user.id, orgId)
    : { effective: [], denied: [] };
  // listEffectivePermissions 现返回带来源链结构;me 只需权限名做门控,提取 effective.permission。
  const permissions = toAppPermissions(result.effective.map(p => p.permission));

  return successResponse(c, {
    user: { id: user.id, name: user.name, email: user.email, orgId: user.orgId ?? null },
    permissions,
  });
};

/** 自助修改显示名:固定 userId = 当前用户;me 不需 iam.* 权限(改自己)。 */
export const updateMeHandler: AppRouteHandler<UpdateMeRoute> = async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new AppError("COMMON_UNAUTHORIZED");
  }
  const body = c.req.valid("json");
  const updated = await MeService.updateMe(user.id, body);
  return successResponse(c, updated);
};

/**
 * 自助修改密码:verifyPassword 验当前密码 → hashPassword → update account → 删全部 session。
 * 成功返回空(successResponse null),前端收到后 signOut + 跳 /login。
 */
export const changeMyPasswordHandler: AppRouteHandler<ChangeMyPasswordRoute> = async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new AppError("COMMON_UNAUTHORIZED");
  }
  const body = c.req.valid("json");
  await MeService.changeMyPassword(user.id, body.currentPassword, body.newPassword, c.req.raw.headers);
  return successResponse(c, null);
};
