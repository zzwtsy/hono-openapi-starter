import type { ChangeMyPasswordRoute, GetMeRoute, UpdateMeRoute } from "./routes.js";

import type { UserPermissionsResult } from "@/core/authorization/index.js";
import type { AppRouteHandler } from "@/core/http/context.js";
import { toAppPermissionCodes } from "@/catalogs/permissions.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { successResponse } from "@/core/http/response.js";
import { MeService } from "./service.js";

/** 获取当前用户信息与有效权限。me 只需认证,不需 iam.* 权限(看自己)。 */
export const getMeHandler: AppRouteHandler<GetMeRoute> = async (c) => {
  const user = c.get("user");
  // requireAuth 应已跑并注入 user;me 未挂 requirePermission,防御性自防(与 require-permission 一致)
  if (!user) {
    throw new AppError("COMMON_UNAUTHORIZED");
  }
  const orgId = user.orgId;
  // 数据库保证 orgId 非空；若认证适配器仍返回 null，说明数据库不变量或映射已损坏。
  if (orgId == null) {
    throw new AppError("COMMON_INTERNAL_ERROR");
  }
  const result: UserPermissionsResult = await PermissionService.listEffectivePermissions(user.id, orgId);
  // listEffectivePermissions 现返回带来源链结构;me 只需 code 做门控。
  const permissionCodes = toAppPermissionCodes(result.effective.map(p => p.permissionCode));
  const isSystemRootUser = await MeService.isSystemRootOrg(orgId);

  return successResponse(c, {
    user: { id: user.id, name: user.name, email: user.email, orgId },
    isSystemRootUser,
    permissionCodes,
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
