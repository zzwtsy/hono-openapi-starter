import type { AppBindings } from "../http/context.js";
import type { AppPermission } from "./permissions.js";
import { createMiddleware } from "hono/factory";

import { PermissionService } from "../authorization/index.js";
import { AppError } from "../errors/app-error.js";

/**
 * 权限中间件:检查当前用户在某组织是否有指定权限。
 *
 * - 需在 `requireAuth` 之后调用(读 `c.get("user")`)
 * - orgId 默认 `user.orgId`;显式传入则用传入的
 * - 请求级 memoize 由全局 `permissionCacheMiddleware`(ALS)提供,调用方无需关心
 * - `permission` 必须是 `AppPermission` union 的成员(从 `permissions-catalog.ts` 的
 *   `allPermissions` 数组推导);若 TS 报 "string 不可赋值给 never",说明对应 feature 还没在
 *   catalog 展开自己的权限数组
 *
 * @throws {AppError} COMMON_UNAUTHORIZED - user 不存在(防御性,requireAuth 应已跑)
 * @throws {AppError} COMMON_FORBIDDEN - user.orgId 为 null(无组织无权限)或权限检查未通过
 *
 * 见 [权限层规范](../../../docs/conventions/authorization.md)、ADR-0004。
 */
export function requirePermission(permission: AppPermission, options?: { orgId?: string }) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      // requireAuth 应已跑;防御性检查
      throw new AppError("COMMON_UNAUTHORIZED");
    }

    const orgId = options?.orgId ?? user.orgId;
    if (orgId == null) {
      // 所有授权绑组织,无组织无权限
      throw new AppError("COMMON_FORBIDDEN");
    }

    const allowed = await PermissionService.check(user.id, permission, orgId);
    if (!allowed) {
      throw new AppError("COMMON_FORBIDDEN");
    }

    await next();
  });
}
