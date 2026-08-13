import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse } from "@/core/http/openapi/helpers.js";

export const permissionsReadMiddleware = [requireAuth(), requirePermission("permissions.read")];
export const rolesReadMiddleware = [requireAuth(), requirePermission("roles.read")];
export const organizationsReadMiddleware = [requireAuth(), requirePermission("organizations.read")];
export const assignmentsReadMiddleware = [requireAuth()];
export const usersReadMiddleware = [requireAuth(), requirePermission("users.read")];
// 目标相关写操作不能先按 actor Home org 检查，否则“权限只授在子组织”的管理员无法操作该子组织。
// middleware 只认证，service 在事务与拓扑锁内按实际目标 org 执行 PEP。
export const organizationsCreateMiddleware = [requireAuth()];
export const organizationsUpdateMiddleware = [requireAuth()];
export const organizationsDeleteMiddleware = [requireAuth()];
export const rolesCreateMiddleware = [requireAuth()];
export const rolesUpdateMiddleware = [requireAuth()];
export const rolesDeleteMiddleware = [requireAuth()];
export const rolesAssignPermissionsMiddleware = [requireAuth()];
export const rolesRevokePermissionsMiddleware = [requireAuth()];
export const rolePermissionsUpdateMiddleware = [requireAuth()];
export const assignmentsGrantMiddleware = [requireAuth()];
export const assignmentsRevokeMiddleware = [requireAuth()];
export const usersCreateMiddleware = [requireAuth()];
export const usersUpdateMiddleware = [requireAuth()];
export const usersResetPasswordMiddleware = [requireAuth()];
export const usersDisableMiddleware = [requireAuth()];
export const usersEnableMiddleware = [requireAuth()];
export const authErrorResponses = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  403: jsonErrorResponse("无权限", "COMMON_FORBIDDEN"),
};
