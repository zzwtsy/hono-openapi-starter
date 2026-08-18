import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import {
  buildIamApp,
  mockPermission,
  mockSession,
  mockUser,
} from "../../../tests/helpers/iam-route-test-helpers.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const {
  mockGetSession,
  mockCheck,
  mockAssignUserRole,
  mockDeleteUserRole,
  mockAssignUserPermission,
  mockDeleteUserPermission,
  mockListUserEffectivePermissions,
  mockListUserRoles,
  mockListUserDirectPermissions,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockAssignUserRole: vi.fn(),
  mockDeleteUserRole: vi.fn(),
  mockAssignUserPermission: vi.fn(),
  mockDeleteUserPermission: vi.fn(),
  mockListUserEffectivePermissions: vi.fn(),
  mockListUserRoles: vi.fn(),
  mockListUserDirectPermissions: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("../../core/audit/index.js", async () => ({
  audit: (await import("../../../tests/helpers/audit-passthrough.js")).auditPassthrough,
}));
vi.mock("./service.js", () => ({
  IamService: {
    assignUserRole: (_actor: unknown, userId: string, roleId: string, input: unknown) => mockAssignUserRole("org-1", userId, roleId, input) as unknown,
    deleteUserRole: (_actor: unknown, userId: string, roleId: string, orgId: string) => mockDeleteUserRole("org-1", "u-1", userId, roleId, orgId) as unknown,
    assignUserPermission: (_actor: unknown, userId: string, code: string, input: unknown) => mockAssignUserPermission("org-1", userId, code, input) as unknown,
    deleteUserPermission: (_actor: unknown, userId: string, code: string, orgId: string) => mockDeleteUserPermission("org-1", "u-1", userId, code, orgId) as unknown,
    listUserEffectivePermissions: (_actor: unknown, userId: string, orgId: string) => mockListUserEffectivePermissions("org-1", userId, orgId) as unknown,
    listUserRoles: (_actor: unknown, userId: string, orgId: string) => mockListUserRoles("org-1", userId, orgId) as unknown,
    listUserDirectPermissions: (_actor: unknown, userId: string, orgId: string) => mockListUserDirectPermissions("org-1", userId, orgId) as unknown,
  },
}));

function buildApp() {
  return buildIamApp((app) => {
    app.openapi(routes.assignUserRoleRoute, handlers.assignUserRoleHandler);
    app.openapi(routes.deleteUserRoleRoute, handlers.deleteUserRoleHandler);
    app.openapi(routes.assignUserPermissionRoute, handlers.assignUserPermissionHandler);
    app.openapi(routes.deleteUserPermissionRoute, handlers.deleteUserPermissionHandler);
    app.openapi(routes.listUserPermissionsRoute, handlers.listUserPermissionsHandler);
    app.openapi(routes.listUserRolesRoute, handlers.listUserRolesHandler);
    app.openapi(routes.listUserDirectPermissionsRoute, handlers.listUserDirectPermissionsHandler);
  });
}

function authed() {
  mockGetSession.mockResolvedValue({ user: mockUser as never, session: mockSession as never });
  mockCheck.mockResolvedValue(true);
}

describe("IAM assignment routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const requirePermission = async (permissionCode: string) => {
      const allowed = await mockCheck("u-1", permissionCode, "org-1") as boolean;
      if (!allowed) {
        throw new AppError("COMMON_FORBIDDEN");
      }
    };
    mockAssignUserRole.mockImplementation(async () => requirePermission("assignments.grant"));
    mockDeleteUserRole.mockImplementation(async () => requirePermission("assignments.revoke"));
    mockAssignUserPermission.mockImplementation(async () => requirePermission("assignments.grant"));
    mockDeleteUserPermission.mockImplementation(async () => requirePermission("assignments.revoke"));
    mockListUserEffectivePermissions.mockImplementation(async () => requirePermission("assignments.read"));
    mockListUserRoles.mockImplementation(async () => requirePermission("assignments.read"));
    mockListUserDirectPermissions.mockImplementation(async () => requirePermission("assignments.read"));
  });

  // 授予用户角色。
  it("assignUserRole 无 assignments.grant 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles/r-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("assignUserRole 有 assignments.grant 调 service 返回 200", async () => {
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

  // 撤销用户角色。
  it("deleteUserRole 无 assignments.revoke 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteUserRole 有 assignments.revoke 调 service 返回 200", async () => {
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
    mockDeleteUserRole.mockRejectedValue(new AppError("USER_CANNOT_REVOKE_OWN_AUTH"));

    const res = await buildApp().request("/users/u-2/roles/r-1?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  // 直接授权。
  it("assignUserPermission 无 assignments.grant 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions/projects.read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1", effect: "allow" }),
    });
    expect(res.status).toBe(403);
  });

  it("assignUserPermission 有 assignments.grant 调 service 返回 200", async () => {
    authed();
    mockAssignUserPermission.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/permissions/projects.read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1", effect: "deny" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; permissionCode: string; orgId: string; effect: string } };
    expect(body.data).toEqual({ userId: "u-2", permissionCode: "projects.read", orgId: "org-1", effect: "deny" });
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

  // 撤销直接权限。
  it("deleteUserPermission 无 assignments.revoke 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteUserPermission 有 assignments.revoke 调 service 返回 200", async () => {
    authed();
    mockDeleteUserPermission.mockResolvedValue(undefined);

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { userId: string; permissionCode: string; orgId: string } };
    expect(body.data).toEqual({ userId: "u-2", permissionCode: "projects.read", orgId: "org-1" });
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
    mockDeleteUserPermission.mockRejectedValue(new AppError("USER_CANNOT_REVOKE_OWN_AUTH"));

    const res = await buildApp().request("/users/u-2/permissions/projects.read?orgId=org-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  // 用户有效权限全集。
  it("listUserPermissions 无 assignments.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/permissions?orgId=org-1");
    expect(res.status).toBe(403);
  });

  it("listUserPermissions 有 assignments.read 调 service 返回 200", async () => {
    authed();
    mockListUserEffectivePermissions.mockResolvedValue({
      effective: [
        { permissionCode: "projects.read", sources: [] },
        { permissionCode: "assignments.read", sources: [] },
      ],
      denied: [],
    });

    const res = await buildApp().request("/users/u-2/permissions?orgId=org-1");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { effective: { permission: { code: string } }[] } };
    expect(body.data.effective.map(item => item.permission.code)).toEqual(["projects.read", "assignments.read"]);
    expect(mockListUserEffectivePermissions).toHaveBeenCalledWith("org-1", "u-2", "org-1");
  });

  // 用户已授角色记录，用于撤销原始授权。
  it("listUserRoles 无 assignments.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/roles?orgId=org-1");
    expect(res.status).toBe(403);
  });

  it("listUserRoles 有 assignments.read 调 service 返回 200", async () => {
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

  // 用户直接授权记录，用于撤销原始授权。
  it("listUserDirectPermissions 无 assignments.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/direct-permissions?orgId=org-1");
    expect(res.status).toBe(403);
  });

  it("listUserDirectPermissions 有 assignments.read 调 service 返回 200", async () => {
    authed();
    const direct = {
      permission: mockPermission,
      effect: "deny" as const,
      orgId: "org-1",
      expiresAt: null,
    };
    mockListUserDirectPermissions.mockResolvedValue([direct]);

    const res = await buildApp().request("/users/u-2/direct-permissions?orgId=org-1");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { permission: typeof mockPermission; effect: string }[] };
    expect(body.data[0]).toEqual({ permission: mockPermission, effect: "deny", orgId: "org-1", expiresAt: null });
    expect(mockListUserDirectPermissions).toHaveBeenCalledWith("org-1", "u-2", "org-1");
  });

  // 读端点将 service 的 NOT_FOUND 映射为 404，验证 handler -> error-handler -> HTTP 链路。
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

  // 组织列表。
});
