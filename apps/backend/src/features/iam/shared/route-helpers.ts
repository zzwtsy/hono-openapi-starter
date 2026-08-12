import type { AppPermissionCode } from "@/core/auth/permissions.js";
import type { AppBindings } from "@/core/http/context.js";
import { createMiddleware } from "hono/factory";

import { requireOrgUser } from "@/core/auth/context.js";
import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { jsonErrorResponse } from "@/core/http/openapi/helpers.js";

export const permissionsReadMiddleware = [requireAuth(), requirePermission("permissions.read")];
export const rolesReadMiddleware = [requireAuth(), requirePermission("roles.read")];
export const organizationsReadMiddleware = [requireAuth(), requirePermission("organizations.read")];
export const assignmentsReadMiddleware = [requireAuth(), requirePermission("assignments.read")];
export const usersReadMiddleware = [requireAuth(), requirePermission("users.read")];
export const organizationsCreateMiddleware = [requireAuth(), requirePermission("organizations.create")];
export const organizationsUpdateMiddleware = [requireAuth(), requirePermission("organizations.update")];
export const organizationsDeleteMiddleware = [requireAuth(), requirePermission("organizations.delete")];
export const rolesCreateMiddleware = [requireAuth(), requirePermission("roles.create")];
export const rolesUpdateMiddleware = [requireAuth(), requirePermission("roles.update")];
export const rolesDeleteMiddleware = [requireAuth(), requirePermission("roles.delete")];
export const rolesAssignPermissionsMiddleware = [requireAuth(), requirePermission("roles.assign-permissions")];
export const rolesRevokePermissionsMiddleware = [requireAuth(), requirePermission("roles.revoke-permissions")];
export const rolePermissionsUpdateMiddleware = [
  requireAuth(),
  createMiddleware<AppBindings>(async (c, next) => {
    const { id, orgId } = requireOrgUser(c);
    const body = await c.req.raw.clone().json().catch(() => ({})) as {
      addPermissionCodes: AppPermissionCode[];
      removePermissionCodes: AppPermissionCode[];
    };
    const addPermissionCodes = body.addPermissionCodes ?? [];
    const removePermissionCodes = body.removePermissionCodes ?? [];
    const requiredPermissions: AppPermissionCode[] = [];
    if (addPermissionCodes.length > 0) {
      requiredPermissions.push("roles.assign-permissions");
    }
    if (removePermissionCodes.length > 0) {
      requiredPermissions.push("roles.revoke-permissions");
    }
    const allowed = await Promise.all(
      requiredPermissions.map(async permissionCode => PermissionService.check(id, permissionCode, orgId)),
    );
    if (allowed.some(value => !value)) {
      throw new AppError("COMMON_FORBIDDEN");
    }
    await next();
  }),
];
export const assignmentsGrantMiddleware = [requireAuth(), requirePermission("assignments.grant")];
export const assignmentsRevokeMiddleware = [requireAuth(), requirePermission("assignments.revoke")];
export const usersCreateMiddleware = [requireAuth(), requirePermission("users.create")];
export const usersUpdateMiddleware = [requireAuth(), requirePermission("users.update")];
export const usersResetPasswordMiddleware = [requireAuth(), requirePermission("users.reset-password")];
export const usersDisableMiddleware = [requireAuth(), requirePermission("users.disable")];
export const usersEnableMiddleware = [requireAuth(), requirePermission("users.enable")];
export const authErrorResponses = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  403: jsonErrorResponse("无权限", "COMMON_FORBIDDEN"),
};
