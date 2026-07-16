import type {
  AssignRolePermissionsRoute,
  AssignUserPermissionRoute,
  AssignUserRoleRoute,
  CreateOrganizationRoute,
  CreateRoleRoute,
  CreateUserRoute,
  DeleteOrganizationRoute,
  DeleteRolePermissionRoute,
  DeleteRoleRoute,
  DeleteUserPermissionRoute,
  DeleteUserRoleRoute,
  DisableUserRoute,
  EnableUserRoute,
  GetOrganizationRoute,
  ListOrganizationsRoute,
  ListPermissionsRoute,
  ListRolePermissionsRoute,
  ListRolesRoute,
  ListUserDirectPermissionsRoute,
  ListUserPermissionsRoute,
  ListUserRolesRoute,
  ListUsersRoute,
  ResetUserPasswordRoute,
  UpdateOrganizationRoute,
  UpdateRoleRoute,
  UpdateUserRoute,
} from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";
import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { IamService } from "./service.js";

// --- 权限目录 ---
export const listPermissionsHandler: AppRouteHandler<ListPermissionsRoute> = async (c) => {
  const items = await IamService.listPermissions();
  return successResponse(c, items);
};

// --- 角色 ---
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
  await IamService.assignRolePermissions(roleId, body.permissions);
  const current = await IamService.listRolePermissions(roleId);
  return successResponse(c, current);
};

export const deleteRolePermissionHandler: AppRouteHandler<DeleteRolePermissionRoute> = async (c) => {
  const { roleId, permission } = c.req.valid("param");
  await IamService.deleteRolePermission(roleId, permission);
  return successResponse(c, { permission });
};

// --- 用户 ---
export const listUsersHandler: AppRouteHandler<ListUsersRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const items = await IamService.listUsers(orgId);
  return successResponse(c, items);
};

// --- 用户管理 ---
export const createUserHandler: AppRouteHandler<CreateUserRoute> = async (c) => {
  const { orgId: actorOrgId } = requireOrgUser(c);
  const body = c.req.valid("json");
  const created = await IamService.createUser(actorOrgId, body);
  return successResponse(c, created);
};

export const updateUserHandler: AppRouteHandler<UpdateUserRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await IamService.updateUser(orgId, userId, body);
  return successResponse(c, updated);
};

export const resetUserPasswordHandler: AppRouteHandler<ResetUserPasswordRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.resetPassword(orgId, userId, body.newPassword);
  return successResponse(c, { userId });
};

export const disableUserHandler: AppRouteHandler<DisableUserRoute> = async (c) => {
  const { id, orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const updated = await IamService.disableUser(orgId, id, userId);
  return successResponse(c, updated);
};

export const enableUserHandler: AppRouteHandler<EnableUserRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const updated = await IamService.enableUser(orgId, userId);
  return successResponse(c, updated);
};

// --- 用户授权 ---
export const assignUserRoleHandler: AppRouteHandler<AssignUserRoleRoute> = async (c) => {
  const { userId, roleId } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.assignUserRole(userId, roleId, body);
  return successResponse(c, { userId, roleId, orgId: body.orgId });
};

export const deleteUserRoleHandler: AppRouteHandler<DeleteUserRoleRoute> = async (c) => {
  const { userId, roleId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  await IamService.deleteUserRole(userId, roleId, orgId);
  return successResponse(c, { userId, roleId, orgId });
};

export const assignUserPermissionHandler: AppRouteHandler<AssignUserPermissionRoute> = async (c) => {
  const { userId, permission } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.assignUserPermission(userId, permission, body);
  return successResponse(c, { userId, permission, orgId: body.orgId, effect: body.effect });
};

export const deleteUserPermissionHandler: AppRouteHandler<DeleteUserPermissionRoute> = async (c) => {
  const { userId, permission } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  await IamService.deleteUserPermission(userId, permission, orgId);
  return successResponse(c, { userId, permission, orgId });
};

export const listUserPermissionsHandler: AppRouteHandler<ListUserPermissionsRoute> = async (c) => {
  const { userId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  const perms = await IamService.listUserEffectivePermissions(userId, orgId);
  return successResponse(c, perms);
};

export const listUserRolesHandler: AppRouteHandler<ListUserRolesRoute> = async (c) => {
  const { userId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  const roles = await IamService.listUserRoles(userId, orgId);
  return successResponse(c, roles);
};

export const listUserDirectPermissionsHandler: AppRouteHandler<ListUserDirectPermissionsRoute> = async (c) => {
  const { userId } = c.req.valid("param");
  const { orgId } = c.req.valid("query");
  const perms = await IamService.listUserDirectPermissions(userId, orgId);
  return successResponse(c, perms);
};

// --- 组织 ---
export const listOrganizationsHandler: AppRouteHandler<ListOrganizationsRoute> = async (c) => {
  const items = await IamService.listOrganizations();
  return successResponse(c, items);
};

export const createOrganizationHandler: AppRouteHandler<CreateOrganizationRoute> = async (c) => {
  const body = c.req.valid("json");
  const org = await IamService.createOrganization(body);
  return successResponse(c, org);
};

export const getOrganizationHandler: AppRouteHandler<GetOrganizationRoute> = async (c) => {
  const { orgId } = c.req.valid("param");
  const org = await IamService.getOrganizationById(orgId);
  return successResponse(c, org);
};

export const updateOrganizationHandler: AppRouteHandler<UpdateOrganizationRoute> = async (c) => {
  const { orgId } = c.req.valid("param");
  const body = c.req.valid("json");
  const org = await IamService.updateOrganization(orgId, body);
  return successResponse(c, org);
};

export const deleteOrganizationHandler: AppRouteHandler<DeleteOrganizationRoute> = async (c) => {
  const { orgId } = c.req.valid("param");
  await IamService.deleteOrganization(orgId);
  return successResponse(c, { id: orgId });
};
