import type {
  AssignUserPermissionRoute,
  AssignUserRoleRoute,
  DeleteUserPermissionRoute,
  DeleteUserRoleRoute,
  ListUserDirectPermissionsRoute,
  ListUserPermissionsRoute,
  ListUserRolesRoute,
} from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { toPermissionRefs } from "@/catalogs/permissions.js";
import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const assignUserRoleHandler: AppRouteHandler<AssignUserRoleRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId, roleId } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.assignUserRole(actor, userId, roleId, body);
  return successResponse(c, { userId, roleId, orgId: body.orgId });
};

export const deleteUserRoleHandler: AppRouteHandler<DeleteUserRoleRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId, roleId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  await IamService.deleteUserRole(actor, userId, roleId, orgId);
  return successResponse(c, { userId, roleId, orgId });
};

export const assignUserPermissionHandler: AppRouteHandler<AssignUserPermissionRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId, permissionCode } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.assignUserPermission(actor, userId, permissionCode, body);
  return successResponse(c, { userId, permissionCode, orgId: body.orgId, effect: body.effect });
};

export const deleteUserPermissionHandler: AppRouteHandler<DeleteUserPermissionRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId, permissionCode } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  await IamService.deleteUserPermission(actor, userId, permissionCode, orgId);
  return successResponse(c, { userId, permissionCode, orgId });
};

export const listUserPermissionsHandler: AppRouteHandler<ListUserPermissionsRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  const result = await IamService.listUserEffectivePermissions(actor, userId, orgId);
  return successResponse(c, {
    effective: result.effective.map(item => ({
      permission: toPermissionRefs([item.permissionCode])[0],
      sources: item.sources,
    })),
    denied: result.denied.map(item => ({
      permission: toPermissionRefs([item.permissionCode])[0],
      deniedBy: item.deniedBy,
      suppressedSources: item.suppressedSources,
    })),
  });
};

export const listUserRolesHandler: AppRouteHandler<ListUserRolesRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  const roles = await IamService.listUserRoles(actor, userId, orgId);
  return successResponse(c, roles);
};

export const listUserDirectPermissionsHandler: AppRouteHandler<ListUserDirectPermissionsRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  const perms = await IamService.listUserDirectPermissions(actor, userId, orgId);
  return successResponse(c, perms);
};
