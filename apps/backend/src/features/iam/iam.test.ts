import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "@/core/http/context.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const {
  mockGetSession,
  mockCheck,
  mockListPermissions,
  mockListRoles,
  mockListUsers,
  mockCreateUser,
  mockUpdateUser,
  mockResetPassword,
  mockDisableUser,
  mockEnableUser,
  mockCreateRole,
  mockUpdateRole,
  mockDeleteRole,
  mockListRolePermissions,
  mockAssignRolePermissions,
  mockDeleteRolePermission,
  mockAssignUserRole,
  mockDeleteUserRole,
  mockAssignUserPermission,
  mockDeleteUserPermission,
  mockListUserEffectivePermissions,
  mockListUserRoles,
  mockListUserDirectPermissions,
  mockListOrganizations,
  mockCreateOrganization,
  mockGetOrganizationById,
  mockUpdateOrganization,
  mockDeleteOrganization,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockListPermissions: vi.fn(),
  mockListRoles: vi.fn(),
  mockListUsers: vi.fn(),
  mockCreateUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockResetPassword: vi.fn(),
  mockDisableUser: vi.fn(),
  mockEnableUser: vi.fn(),
  mockCreateRole: vi.fn(),
  mockUpdateRole: vi.fn(),
  mockDeleteRole: vi.fn(),
  mockListRolePermissions: vi.fn(),
  mockAssignRolePermissions: vi.fn(),
  mockDeleteRolePermission: vi.fn(),
  mockAssignUserRole: vi.fn(),
  mockDeleteUserRole: vi.fn(),
  mockAssignUserPermission: vi.fn(),
  mockDeleteUserPermission: vi.fn(),
  mockListUserEffectivePermissions: vi.fn(),
  mockListUserRoles: vi.fn(),
  mockListUserDirectPermissions: vi.fn(),
  mockListOrganizations: vi.fn(),
  mockCreateOrganization: vi.fn(),
  mockGetOrganizationById: vi.fn(),
  mockUpdateOrganization: vi.fn(),
  mockDeleteOrganization: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("./service.js", () => ({
  IamService: {
    listPermissions: mockListPermissions,
    listRoles: mockListRoles,
    listUsers: mockListUsers,
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
    resetPassword: mockResetPassword,
    disableUser: mockDisableUser,
    enableUser: mockEnableUser,
    createRole: mockCreateRole,
    updateRole: mockUpdateRole,
    deleteRole: mockDeleteRole,
    listRolePermissions: mockListRolePermissions,
    assignRolePermissions: mockAssignRolePermissions,
    deleteRolePermission: mockDeleteRolePermission,
    assignUserRole: mockAssignUserRole,
    deleteUserRole: mockDeleteUserRole,
    assignUserPermission: mockAssignUserPermission,
    deleteUserPermission: mockDeleteUserPermission,
    listUserEffectivePermissions: mockListUserEffectivePermissions,
    listUserRoles: mockListUserRoles,
    listUserDirectPermissions: mockListUserDirectPermissions,
    listOrganizations: mockListOrganizations,
    createOrganization: mockCreateOrganization,
    getOrganizationById: mockGetOrganizationById,
    updateOrganization: mockUpdateOrganization,
    deleteOrganization: mockDeleteOrganization,
  },
}));

const mockUser = { id: "u-1", orgId: "org-1", email: "a@b.c", name: "a" };
const mockSession = { id: "s-1", userId: "u-1", token: "t" };
const mockPermission = {
  name: "projects.read",
  description: "查看项目",
  createdAt: new Date("2026-07-07T00:00:00.000Z"),
  updatedAt: new Date("2026-07-07T00:00:00.000Z"),
};
const mockRole = {
  id: "r-1",
  name: "viewer",
  description: null,
  source: "instance" as const,
  createdAt: new Date("2026-07-07T00:00:00.000Z"),
  updatedAt: new Date("2026-07-07T00:00:00.000Z"),
};
const mockOrg = {
  id: "org-root",
  name: "Root",
  parentId: null,
  createdAt: new Date("2026-07-07T00:00:00.000Z"),
  updatedAt: new Date("2026-07-07T00:00:00.000Z"),
};

function buildApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.openapi(routes.listPermissionsRoute, handlers.listPermissionsHandler);
  app.openapi(routes.listUsersRoute, handlers.listUsersHandler);
  app.openapi(routes.createUserRoute, handlers.createUserHandler);
  app.openapi(routes.updateUserRoute, handlers.updateUserHandler);
  app.openapi(routes.resetUserPasswordRoute, handlers.resetUserPasswordHandler);
  app.openapi(routes.disableUserRoute, handlers.disableUserHandler);
  app.openapi(routes.enableUserRoute, handlers.enableUserHandler);
  app.openapi(routes.listRolesRoute, handlers.listRolesHandler);
  app.openapi(routes.createRoleRoute, handlers.createRoleHandler);
  app.openapi(routes.updateRoleRoute, handlers.updateRoleHandler);
  app.openapi(routes.deleteRoleRoute, handlers.deleteRoleHandler);
  app.openapi(routes.listRolePermissionsRoute, handlers.listRolePermissionsHandler);
  app.openapi(routes.assignRolePermissionsRoute, handlers.assignRolePermissionsHandler);
  app.openapi(routes.deleteRolePermissionRoute, handlers.deleteRolePermissionHandler);
  app.openapi(routes.assignUserRoleRoute, handlers.assignUserRoleHandler);
  app.openapi(routes.deleteUserRoleRoute, handlers.deleteUserRoleHandler);
  app.openapi(routes.assignUserPermissionRoute, handlers.assignUserPermissionHandler);
  app.openapi(routes.deleteUserPermissionRoute, handlers.deleteUserPermissionHandler);
  app.openapi(routes.listUserPermissionsRoute, handlers.listUserPermissionsHandler);
  app.openapi(routes.listUserRolesRoute, handlers.listUserRolesHandler);
  app.openapi(routes.listUserDirectPermissionsRoute, handlers.listUserDirectPermissionsHandler);
  app.openapi(routes.listOrganizationsRoute, handlers.listOrganizationsHandler);
  app.openapi(routes.createOrganizationRoute, handlers.createOrganizationHandler);
  app.openapi(routes.getOrganizationRoute, handlers.getOrganizationHandler);
  app.openapi(routes.updateOrganizationRoute, handlers.updateOrganizationHandler);
  app.openapi(routes.deleteOrganizationRoute, handlers.deleteOrganizationHandler);
  app.onError((err, c) => {
    const status = err instanceof AppError ? err.status : 500;
    return c.json({ code: err instanceof AppError ? err.code : "ERROR" }, status as ContentfulStatusCode);
  });
  return app;
}

function authed() {
  mockGetSession.mockResolvedValue({ user: mockUser as never, session: mockSession as never });
  mockCheck.mockResolvedValue(true);
}

describe("iam routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // --- 权限目录 ---
  it("listPermissions 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/permissions");
    expect(res.status).toBe(403);
  });

  it("listPermissions 有 iam.read 返回权限目录", async () => {
    authed();
    mockListPermissions.mockResolvedValue([mockPermission]);

    const res = await buildApp().request("/permissions");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { name: string }[] };
    expect(body.data[0].name).toBe("projects.read");
  });

  // --- 角色列表 ---
  it("listRoles 有 iam.read 返回角色列表", async () => {
    authed();
    mockListRoles.mockResolvedValue([mockRole]);

    const res = await buildApp().request("/roles");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { name: string }[] };
    expect(body.data[0].name).toBe("viewer");
  });

  // --- 建角色 ---
  it("createRole 无 roles.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "viewer" }),
    });
    expect(res.status).toBe(403);
  });

  it("createRole 有 roles.manage 调 service 返回 200", async () => {
    authed();
    mockCreateRole.mockResolvedValue(mockRole);

    const res = await buildApp().request("/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "viewer" }),
    });
    expect(res.status).toBe(200);
    expect(mockCreateRole).toHaveBeenCalledWith({ name: "viewer" });
  });

  // --- 改角色 ---
  it("updateRole 无 roles.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "editor" }),
    });
    expect(res.status).toBe(403);
  });

  it("updateRole 有 roles.manage 调 service 返回 200", async () => {
    authed();
    mockUpdateRole.mockResolvedValue({ ...mockRole, name: "editor" });

    const res = await buildApp().request("/roles/r-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "editor" }),
    });
    expect(res.status).toBe(200);
    expect(mockUpdateRole).toHaveBeenCalledWith("r-1", { name: "editor" });
  });

  it("updateRole service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockUpdateRole.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "editor" }),
    });
    expect(res.status).toBe(404);
  });

  // --- 删角色 ---
  it("deleteRole service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteRole.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(mockDeleteRole).toHaveBeenCalledWith("r-1");
  });

  // --- 角色权限列表 ---
  it("listRolePermissions 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1/permissions");
    expect(res.status).toBe(403);
  });

  it("listRolePermissions 有 iam.read 调 service 返回 200", async () => {
    authed();
    mockListRolePermissions.mockResolvedValue(["projects.read"]);

    const res = await buildApp().request("/roles/r-1/permissions");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: string[] };
    expect(body.data).toEqual(["projects.read"]);
    expect(mockListRolePermissions).toHaveBeenCalledWith("r-1");
  });

  it("listRolePermissions service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockListRolePermissions.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1/permissions");
    expect(res.status).toBe(404);
  });

  // --- 给角色配权限 ---
  it("assignRolePermissions 返回角色当前权限列表", async () => {
    authed();
    mockAssignRolePermissions.mockResolvedValue(undefined);
    mockListRolePermissions.mockResolvedValue(["projects.read"]);

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissions: ["projects.read"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: string[] };
    expect(body.data).toEqual(["projects.read"]);
    expect(mockAssignRolePermissions).toHaveBeenCalledWith("r-1", ["projects.read"]);
  });

  // --- 撤角色权限 ---
  it("deleteRolePermission 无 roles.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1/permissions/projects.read", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteRolePermission 有 roles.manage 调 service 返回 200", async () => {
    authed();
    mockDeleteRolePermission.mockResolvedValue(undefined);

    const res = await buildApp().request("/roles/r-1/permissions/projects.read", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { permission: string } };
    expect(body.data.permission).toBe("projects.read");
    expect(mockDeleteRolePermission).toHaveBeenCalledWith("r-1", "projects.read");
  });

  it("deleteRolePermission service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteRolePermission.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1/permissions/projects.read", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  // --- 用户列表 ---
  it("listUsers 无 users.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users");
    expect(res.status).toBe(403);
  });

  it("listUsers 有 users.read 返回用户列表", async () => {
    authed();
    mockListUsers.mockResolvedValue([{
      id: "u-1",
      name: "a",
      email: "a@b.c",
      orgId: "org-1",
      disabled: false,
      createdAt: new Date(),
    }]);

    const res = await buildApp().request("/users");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string }[] };
    expect(body.data[0].id).toBe("u-1");
    expect(mockListUsers).toHaveBeenCalledWith("org-1");
  });

  // --- 用户管理 ---
  const mockUserSummary = {
    id: "u-2",
    name: "b",
    email: "b@b.c",
    orgId: "org-1",
    disabled: false,
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
  };

  it("createUser 无 users.create 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", password: "password-123", name: "b" }),
    });
    expect(res.status).toBe(403);
  });

  it("createUser 有权限时按 orgId+body 调 service", async () => {
    authed();
    mockCreateUser.mockResolvedValue(mockUserSummary);

    const res = await buildApp().request("/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", password: "password-123", name: "b", orgId: "org-1" }),
    });
    expect(res.status).toBe(200);
    expect(mockCreateUser).toHaveBeenCalledWith("org-1", {
      email: "new@example.com",
      password: "password-123",
      name: "b",
      orgId: "org-1",
    });
  });

  it("updateUser 无 users.update 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "bb" }),
    });
    expect(res.status).toBe(403);
  });

  it("updateUser 有权限时按 orgId+userId+body 调 service", async () => {
    authed();
    mockUpdateUser.mockResolvedValue({ ...mockUserSummary, name: "bb" });

    const res = await buildApp().request("/users/u-2", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "bb" }),
    });
    expect(res.status).toBe(200);
    expect(mockUpdateUser).toHaveBeenCalledWith("org-1", "u-2", { name: "bb" });
  });

  it("resetUserPassword 无 users.reset-password 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword: "new-password-123" }),
    });
    expect(res.status).toBe(403);
  });

  it("resetUserPassword 有权限时按 orgId+userId+password 调 service", async () => {
    authed();
    mockResetPassword.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword: "new-password-123" }),
    });
    expect(res.status).toBe(200);
    expect(mockResetPassword).toHaveBeenCalledWith("org-1", "u-2", "new-password-123");
  });

  it("disableUser 无 users.disable 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/disable", { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("disableUser 有权限时传 actorUserId 调 service", async () => {
    authed();
    mockDisableUser.mockResolvedValue({ ...mockUserSummary, disabled: true });

    const res = await buildApp().request("/users/u-2/disable", { method: "POST" });
    expect(res.status).toBe(200);
    expect(mockDisableUser).toHaveBeenCalledWith("org-1", "u-1", "u-2");
  });

  it("disableUser service 抛 FORBIDDEN(自禁用)返回 403", async () => {
    authed();
    mockDisableUser.mockRejectedValue(new AppError("COMMON_FORBIDDEN", { message: "不能禁用自己" }));

    const res = await buildApp().request("/users/u-1/disable", { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("enableUser 无 users.enable 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/enable", { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("enableUser 有权限时按 orgId+userId 调 service", async () => {
    authed();
    mockEnableUser.mockResolvedValue(mockUserSummary);

    const res = await buildApp().request("/users/u-2/enable", { method: "POST" });
    expect(res.status).toBe(200);
    expect(mockEnableUser).toHaveBeenCalledWith("org-1", "u-2");
  });

  // --- 授用户角色 ---
  it("assignUserRole 无 assignments.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles/r-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("assignUserRole 有 assignments.manage 调 service 返回 200", async () => {
    authed();
    mockAssignUserRole.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/roles/r-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1", expiresAt: "2026-12-31T00:00:00.000Z" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; roleId: string; orgId: string } };
    expect(body.data).toEqual({ userId: "u-2", roleId: "r-1", orgId: "org-1" });
    expect(mockAssignUserRole).toHaveBeenCalledWith("org-1", "u-2", "r-1", {
      orgId: "org-1",
      expiresAt: "2026-12-31T00:00:00.000Z",
    });
  });

  it("assignUserRole service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockAssignUserRole.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/roles/r-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1" }),
    });
    expect(res.status).toBe(404);
  });

  // --- 撤用户角色 ---
  it("deleteUserRole 无 assignments.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteUserRole 有 assignments.manage 调 service 返回 200", async () => {
    authed();
    mockDeleteUserRole.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; roleId: string; orgId: string } };
    expect(body.data).toEqual({ userId: "u-2", roleId: "r-1", orgId: "org-1" });
    expect(mockDeleteUserRole).toHaveBeenCalledWith("org-1", "u-1", "u-2", "r-1", "org-1");
  });

  it("deleteUserRole service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteUserRole.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("deleteUserRole service 抛 FORBIDDEN(撤自己)返回 403", async () => {
    authed();
    mockDeleteUserRole.mockRejectedValue(new AppError("COMMON_FORBIDDEN", { message: "不能撤销自己的授权" }));

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  // --- 直接授权 ---
  it("assignUserPermission 无 assignments.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions/projects.read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1", effect: "allow" }),
    });
    expect(res.status).toBe(403);
  });

  it("assignUserPermission 有 assignments.manage 调 service 返回 200", async () => {
    authed();
    mockAssignUserPermission.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/permissions/projects.read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1", effect: "deny" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; permission: string; orgId: string; effect: string } };
    expect(body.data).toEqual({ userId: "u-2", permission: "projects.read", orgId: "org-1", effect: "deny" });
    expect(mockAssignUserPermission).toHaveBeenCalledWith("org-1", "u-2", "projects.read", {
      orgId: "org-1",
      effect: "deny",
    });
  });

  it("assignUserPermission service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockAssignUserPermission.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/permissions/projects.read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1", effect: "allow" }),
    });
    expect(res.status).toBe(404);
  });

  // --- 撤直接权限 ---
  it("deleteUserPermission 无 assignments.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteUserPermission 有 assignments.manage 调 service 返回 200", async () => {
    authed();
    mockDeleteUserPermission.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; permission: string; orgId: string } };
    expect(body.data).toEqual({ userId: "u-2", permission: "projects.read", orgId: "org-1" });
    expect(mockDeleteUserPermission).toHaveBeenCalledWith("org-1", "u-1", "u-2", "projects.read", "org-1");
  });

  it("deleteUserPermission service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteUserPermission.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("deleteUserPermission service 抛 FORBIDDEN(撤自己)返回 403", async () => {
    authed();
    mockDeleteUserPermission.mockRejectedValue(new AppError("COMMON_FORBIDDEN", { message: "不能撤销自己的授权" }));

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  // --- 用户有效权限全集 ---
  it("listUserPermissions 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions?orgId=org-1");
    expect(res.status).toBe(403);
  });

  it("listUserPermissions 有 iam.read 调 service 返回 200", async () => {
    authed();
    mockListUserEffectivePermissions.mockResolvedValue(["projects.read", "iam.read"]);

    const res = await buildApp().request("/users/u-2/permissions?orgId=org-1");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: string[] };
    expect(body.data).toEqual(["projects.read", "iam.read"]);
    expect(mockListUserEffectivePermissions).toHaveBeenCalledWith("org-1", "u-2", "org-1");
  });

  // --- 用户已授角色记录(原始授权,撤销用) ---
  it("listUserRoles 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles?orgId=org-1");
    expect(res.status).toBe(403);
  });

  it("listUserRoles 有 iam.read 调 service 返回 200", async () => {
    authed();
    const assignment = {
      roleId: "r-1",
      roleName: "viewer",
      orgId: "org-1",
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    };
    mockListUserRoles.mockResolvedValue([assignment]);

    const res = await buildApp().request("/users/u-2/roles?orgId=org-1");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { roleId: string; roleName: string }[] };
    expect(body.data[0].roleName).toBe("viewer");
    expect(mockListUserRoles).toHaveBeenCalledWith("org-1", "u-2", "org-1");
  });

  // --- 用户直接授权记录(原始授权,撤销用) ---
  it("listUserDirectPermissions 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/direct-permissions?orgId=org-1");
    expect(res.status).toBe(403);
  });

  it("listUserDirectPermissions 有 iam.read 调 service 返回 200", async () => {
    authed();
    const direct = {
      permission: "projects.read",
      effect: "deny" as const,
      orgId: "org-1",
      expiresAt: null,
    };
    mockListUserDirectPermissions.mockResolvedValue([direct]);

    const res = await buildApp().request("/users/u-2/direct-permissions?orgId=org-1");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { permission: string; effect: string }[] };
    expect(body.data[0]).toEqual({ permission: "projects.read", effect: "deny", orgId: "org-1", expiresAt: null });
    expect(mockListUserDirectPermissions).toHaveBeenCalledWith("org-1", "u-2", "org-1");
  });

  // --- 读端点 service 抛 NOT_FOUND -> 404(对齐同文件 10 个端点模式,验证 handler->error-handler->HTTP 链路) ---
  it("listUserPermissions service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockListUserEffectivePermissions.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/permissions?orgId=org-1");
    expect(res.status).toBe(404);
  });

  it("listUserRoles service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockListUserRoles.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/roles?orgId=org-1");
    expect(res.status).toBe(404);
  });

  it("listUserDirectPermissions service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockListUserDirectPermissions.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/direct-permissions?orgId=org-1");
    expect(res.status).toBe(404);
  });

  // --- 组织列表 ---
  it("listOrganizations 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations");
    expect(res.status).toBe(403);
  });

  it("listOrganizations 有 iam.read 调 service 返回 200", async () => {
    authed();
    mockListOrganizations.mockResolvedValue([mockOrg]);

    const res = await buildApp().request("/organizations");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string }[] };
    expect(body.data[0].id).toBe("org-root");
  });

  // --- 建组织 ---
  it("createOrganization 无 organizations.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "华南" }),
    });
    expect(res.status).toBe(403);
  });

  it("createOrganization 有 organizations.manage 调 service 返回 200", async () => {
    authed();
    mockCreateOrganization.mockResolvedValue(mockOrg);

    const res = await buildApp().request("/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root" }),
    });
    expect(res.status).toBe(200);
    expect(mockCreateOrganization).toHaveBeenCalledWith({ name: "Root" });
  });

  it("createOrganization service 抛 NOT_FOUND(父组织) 返回 404", async () => {
    authed();
    mockCreateOrganization.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "华南", parentId: "no-such-org" }),
    });
    expect(res.status).toBe(404);
  });

  // --- 组织详情 ---
  it("getOrganization 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root");
    expect(res.status).toBe(403);
  });

  it("getOrganization 有 iam.read 调 service 返回 200", async () => {
    authed();
    mockGetOrganizationById.mockResolvedValue(mockOrg);

    const res = await buildApp().request("/organizations/org-root");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string } };
    expect(body.data.id).toBe("org-root");
    expect(mockGetOrganizationById).toHaveBeenCalledWith("org-root");
  });

  it("getOrganization service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockGetOrganizationById.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations/org-root");
    expect(res.status).toBe(404);
  });

  // --- 改组织 ---
  it("updateOrganization 无 organizations.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root Org" }),
    });
    expect(res.status).toBe(403);
  });

  it("updateOrganization 有 organizations.manage 调 service 返回 200", async () => {
    authed();
    mockUpdateOrganization.mockResolvedValue({ ...mockOrg, name: "Root Org" });

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root Org" }),
    });
    expect(res.status).toBe(200);
    expect(mockUpdateOrganization).toHaveBeenCalledWith("org-root", { name: "Root Org" });
  });

  it("updateOrganization service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockUpdateOrganization.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root Org" }),
    });
    expect(res.status).toBe(404);
  });

  it("updateOrganization service 抛 CONFLICT(防环) 返回 409", async () => {
    authed();
    mockUpdateOrganization.mockRejectedValue(new AppError("COMMON_CONFLICT"));

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parentId: "org-child" }),
    });
    expect(res.status).toBe(409);
  });

  // --- 删组织 ---
  it("deleteOrganization 无 organizations.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteOrganization 有 organizations.manage 调 service 返回 200", async () => {
    authed();
    mockDeleteOrganization.mockResolvedValue(undefined);

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string } };
    expect(body.data.id).toBe("org-root");
    expect(mockDeleteOrganization).toHaveBeenCalledWith("org-root");
  });

  it("deleteOrganization service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteOrganization.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("deleteOrganization service 抛 CONFLICT(有子组织) 返回 409", async () => {
    authed();
    mockDeleteOrganization.mockRejectedValue(new AppError("COMMON_CONFLICT"));

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(409);
  });

  // --- 无 session 返回 401 ---
  // requireAuth 是所有 iam 端点的首个中间件,无 session 时统一 401(先于权限检查与 body 校验)。
  // 参数化覆盖全部 26 端点,证明 requireAuth 链路完整(此前只测 403,401 路径零覆盖)。
  const unauthCases: Array<[string, string, string]> = [
    ["get", "/permissions", ""],
    ["get", "/roles", ""],
    ["post", "/roles", "{}"],
    ["patch", "/roles/r-1", "{}"],
    ["delete", "/roles/r-1", ""],
    ["get", "/roles/r-1/permissions", ""],
    ["post", "/roles/r-1/permissions", "{\"permissions\":[]}"],
    ["delete", "/roles/r-1/permissions/projects.read", ""],
    ["get", "/users", ""],
    ["post", "/users", "{}"],
    ["patch", "/users/u-1", "{}"],
    ["post", "/users/u-1/reset-password", "{}"],
    ["post", "/users/u-1/disable", ""],
    ["post", "/users/u-1/enable", ""],
    ["post", "/users/u-1/roles/r-1", "{\"orgId\":\"org-root\"}"],
    ["delete", "/users/u-1/roles/r-1?orgId=org-root", ""],
    ["post", "/users/u-1/permissions/projects.read", "{\"orgId\":\"org-root\",\"effect\":\"allow\"}"],
    ["delete", "/users/u-1/permissions/projects.read?orgId=org-root", ""],
    ["get", "/users/u-1/permissions?orgId=org-root", ""],
    ["get", "/users/u-1/roles?orgId=org-root", ""],
    ["get", "/users/u-1/direct-permissions?orgId=org-root", ""],
    ["get", "/organizations", ""],
    ["post", "/organizations", "{}"],
    ["get", "/organizations/org-root", ""],
    ["patch", "/organizations/org-root", "{}"],
    ["delete", "/organizations/org-root", ""],
  ];
  it.each(unauthCases)("无 session 时 %s %s 返回 401", async (method, path, body) => {
    // 不调 authed():mockGetSession 保持 resetAllMocks 后的默认(undefined),requireAuth 抛 401。
    const init: RequestInit = { method: method.toUpperCase() };
    if (body !== "") {
      init.headers = { "content-type": "application/json" };
      init.body = body;
    }
    const res = await buildApp().request(path, init);
    expect(res.status).toBe(401);
  });
});
