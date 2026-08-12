import type {
  AssignRolePermissionsRoute,
  CreateRoleRoute,
  DeleteRolePermissionRoute,
  DeleteRoleRoute,
  ListRolePermissionsRoute,
  ListRolesRoute,
  ListRoleUsersRoute,
  UpdateRolePermissionsRoute,
  UpdateRoleRoute,
} from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const listRolesHandler: AppRouteHandler<ListRolesRoute> = async (c) => {
  const items = await IamService.listRoles();
  return successResponse(c, items);
};

export const createRoleHandler: AppRouteHandler<CreateRoleRoute> = async (c) => {
  const body = c.req.valid("json");
  const role = await IamService.createRole(body);
  return successResponse(c, role);
};

export const updateRoleHandler: AppRouteHandler<UpdateRoleRoute> = async (c) => {
  const { roleId } = c.req.valid("param");
  const body = c.req.valid("json");
  const role = await IamService.updateRole(roleId, body);
  return successResponse(c, role);
};

export const deleteRoleHandler: AppRouteHandler<DeleteRoleRoute> = async (c) => {
  const { roleId } = c.req.valid("param");
  await IamService.deleteRole(roleId);
  return successResponse(c, { id: roleId });
};

export const listRolePermissionsHandler: AppRouteHandler<ListRolePermissionsRoute> = async (c) => {
  const { roleId } = c.req.valid("param");
  const perms = await IamService.listRolePermissions(roleId);
  return successResponse(c, perms);
};

export const assignRolePermissionsHandler: AppRouteHandler<AssignRolePermissionsRoute> = async (c) => {
  const { roleId } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.assignRolePermissions(roleId, body.permissionCodes);
  const current = await IamService.listRolePermissions(roleId);
  return successResponse(c, current);
};

export const updateRolePermissionsHandler: AppRouteHandler<UpdateRolePermissionsRoute> = async (c) => {
  const { roleId } = c.req.valid("param");
  const body = c.req.valid("json");
  const current = await IamService.updateRolePermissions(roleId, body.addPermissionCodes, body.removePermissionCodes);
  return successResponse(c, current);
};

export const deleteRolePermissionHandler: AppRouteHandler<DeleteRolePermissionRoute> = async (c) => {
  const { roleId, permissionCode } = c.req.valid("param");
  await IamService.deleteRolePermission(roleId, permissionCode);
  return successResponse(c, { permissionCode });
};

export const listRoleUsersHandler: AppRouteHandler<ListRoleUsersRoute> = async (c) => {
  const { orgId: actorOrgId } = requireOrgUser(c);
  const { roleId } = c.req.valid("param");
  const users = await IamService.listRoleUsers(actorOrgId, roleId);
  return successResponse(c, users);
};
