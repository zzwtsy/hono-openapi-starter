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
  it("createRole 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "viewer" }),
    });
    expect(res.status).toBe(403);
  });

  it("createRole 有 iam.manage 调 service 返回 200", async () => {
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
  it("updateRole 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "editor" }),
    });
    expect(res.status).toBe(403);
  });

  it("updateRole 有 iam.manage 调 service 返回 200", async () => {
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
  it("deleteRolePermission 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1/permissions/projects.read", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteRolePermission 有 iam.manage 调 service 返回 200", async () => {
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
  it("listUsers 无 iam.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users");
    expect(res.status).toBe(403);
  });

  it("listUsers 有 iam.read 返回用户列表", async () => {
    authed();
    mockListUsers.mockResolvedValue([{ id: "u-1", name: "a", email: "a@b.c", orgId: "org-1", createdAt: new Date() }]);

    const res = await buildApp().request("/users");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string }[] };
    expect(body.data[0].id).toBe("u-1");
    expect(mockListUsers).toHaveBeenCalledWith("org-1");
  });

  // --- 授用户角色 ---
  it("assignUserRole 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles/r-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("assignUserRole 有 iam.manage 调 service 返回 200", async () => {
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
    expect(mockAssignUserRole).toHaveBeenCalledWith("u-2", "r-1", {
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
  it("deleteUserRole 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteUserRole 有 iam.manage 调 service 返回 200", async () => {
    authed();
    mockDeleteUserRole.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; roleId: string; orgId: string } };
    expect(body.data).toEqual({ userId: "u-2", roleId: "r-1", orgId: "org-1" });
    expect(mockDeleteUserRole).toHaveBeenCalledWith("u-2", "r-1", "org-1");
  });

  it("deleteUserRole service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteUserRole.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  // --- 直接授权 ---
  it("assignUserPermission 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions/projects.read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1", effect: "allow" }),
    });
    expect(res.status).toBe(403);
  });

  it("assignUserPermission 有 iam.manage 调 service 返回 200", async () => {
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
    expect(mockAssignUserPermission).toHaveBeenCalledWith("u-2", "projects.read", {
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
  it("deleteUserPermission 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteUserPermission 有 iam.manage 调 service 返回 200", async () => {
    authed();
    mockDeleteUserPermission.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; permission: string; orgId: string } };
    expect(body.data).toEqual({ userId: "u-2", permission: "projects.read", orgId: "org-1" });
    expect(mockDeleteUserPermission).toHaveBeenCalledWith("u-2", "projects.read", "org-1");
  });

  it("deleteUserPermission service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteUserPermission.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(404);
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
    expect(mockListUserEffectivePermissions).toHaveBeenCalledWith("u-2", "org-1");
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
  it("createOrganization 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "华南" }),
    });
    expect(res.status).toBe(403);
  });

  it("createOrganization 有 iam.manage 调 service 返回 200", async () => {
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
  it("updateOrganization 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root Org" }),
    });
    expect(res.status).toBe(403);
  });

  it("updateOrganization 有 iam.manage 调 service 返回 200", async () => {
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
  it("deleteOrganization 无 iam.manage 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteOrganization 有 iam.manage 调 service 返回 200", async () => {
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
});
