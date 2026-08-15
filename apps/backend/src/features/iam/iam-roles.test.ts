import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import {
  buildIamApp,
  mockPermission,
  mockRole,
  mockSession,
  mockUser,
} from "../../../tests/helpers/iam-route-test-helpers.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const {
  mockGetSession,
  mockCheck,
  mockListRoles,
  mockCreateRole,
  mockUpdateRole,
  mockDeleteRole,
  mockListRolePermissions,
  mockAssignRolePermissions,
  mockUpdateRolePermissions,
  mockDeleteRolePermission,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockListRoles: vi.fn(),
  mockCreateRole: vi.fn(),
  mockUpdateRole: vi.fn(),
  mockDeleteRole: vi.fn(),
  mockListRolePermissions: vi.fn(),
  mockAssignRolePermissions: vi.fn(),
  mockUpdateRolePermissions: vi.fn(),
  mockDeleteRolePermission: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("../../core/audit/index.js", async () => ({
  audit: (await import("../../../tests/helpers/audit-passthrough.js")).auditPassthrough,
}));
vi.mock("./service.js", () => ({
  IamService: {
    listRoles: mockListRoles,
    createRole: (_actor: unknown, input: unknown) => mockCreateRole(input) as unknown,
    updateRole: (_actor: unknown, roleId: string, input: unknown) => mockUpdateRole(roleId, input) as unknown,
    deleteRole: (_actor: unknown, roleId: string) => mockDeleteRole(roleId) as unknown,
    listRolePermissions: mockListRolePermissions,
    assignRolePermissions: (_actor: unknown, roleId: string, codes: string[]) => mockAssignRolePermissions(roleId, codes) as unknown,
    updateRolePermissions: (_actor: unknown, roleId: string, add: string[], remove: string[]) => mockUpdateRolePermissions(roleId, add, remove) as unknown,
    deleteRolePermission: (_actor: unknown, roleId: string, code: string) => mockDeleteRolePermission(roleId, code) as unknown,
  },
}));

function buildApp() {
  return buildIamApp((app) => {
    app.openapi(routes.listRolesRoute, handlers.listRolesHandler);
    app.openapi(routes.createRoleRoute, handlers.createRoleHandler);
    app.openapi(routes.updateRoleRoute, handlers.updateRoleHandler);
    app.openapi(routes.deleteRoleRoute, handlers.deleteRoleHandler);
    app.openapi(routes.listRolePermissionsRoute, handlers.listRolePermissionsHandler);
    app.openapi(routes.assignRolePermissionsRoute, handlers.assignRolePermissionsHandler);
    app.openapi(routes.updateRolePermissionsRoute, handlers.updateRolePermissionsHandler);
    app.openapi(routes.deleteRolePermissionRoute, handlers.deleteRolePermissionHandler);
  });
}

function authed() {
  mockGetSession.mockResolvedValue({ user: mockUser as never, session: mockSession as never });
  mockCheck.mockResolvedValue(true);
}

describe("IAM role routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const requirePermission = async (permissionCode: string) => {
      const allowed = await mockCheck("u-1", permissionCode, "org-1") as boolean;
      if (!allowed) {
        throw new AppError("COMMON_FORBIDDEN");
      }
    };
    mockCreateRole.mockImplementation(async () => requirePermission("roles.create"));
    mockUpdateRole.mockImplementation(async () => requirePermission("roles.update"));
    mockDeleteRole.mockImplementation(async () => requirePermission("roles.delete"));
    mockAssignRolePermissions.mockImplementation(async () => requirePermission("roles.assign-permissions"));
    mockUpdateRolePermissions.mockImplementation(async (_id, add: string[], remove: string[]) => {
      if (add.length > 0)
        await requirePermission("roles.assign-permissions");
      if (remove.length > 0)
        await requirePermission("roles.revoke-permissions");
    });
    mockDeleteRolePermission.mockImplementation(async () => requirePermission("roles.revoke-permissions"));
  });

  // --- 角色列表 ---
  it("listRoles 有 roles.read 返回角色列表", async () => {
    authed();
    mockListRoles.mockResolvedValue([mockRole]);

    const res = await buildApp().request("/roles");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { name: string }[] };
    expect(body.data[0].name).toBe("viewer");
  });

  // --- 建角色 ---
  it("createRole 无 roles.create 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "viewer" }),
    });
    expect(res.status).toBe(403);
  });

  it("createRole 有 roles.create 调 service 返回 200", async () => {
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
  it("updateRole 无 roles.update 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "editor" }),
    });
    expect(res.status).toBe(403);
  });

  it("updateRole 有 roles.update 调 service 返回 200", async () => {
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
  it("deleteRole 无 roles.delete 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteRole service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteRole.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(mockDeleteRole).toHaveBeenCalledWith("r-1");
  });

  // --- 角色权限列表 ---
  it("listRolePermissions 无 roles.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1/permissions");
    expect(res.status).toBe(403);
  });

  it("listRolePermissions 有 roles.read 调 service 返回 200", async () => {
    authed();
    mockListRolePermissions.mockResolvedValue([mockPermission]);

    const res = await buildApp().request("/roles/r-1/permissions");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: typeof mockPermission[] };
    expect(body.data).toEqual([mockPermission]);
    expect(mockListRolePermissions).toHaveBeenCalledWith("r-1");
  });

  it("listRolePermissions service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockListRolePermissions.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1/permissions");
    expect(res.status).toBe(404);
  });

  // --- 给角色配权限 ---
  it("assignRolePermissions 无 roles.assign-permissions 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissionCodes: ["projects.read"] }),
    });
    expect(res.status).toBe(403);
  });

  it("assignRolePermissions 返回角色当前权限列表", async () => {
    authed();
    mockAssignRolePermissions.mockResolvedValue(undefined);
    mockListRolePermissions.mockResolvedValue([mockPermission]);

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissionCodes: ["projects.read"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: typeof mockPermission[] };
    expect(body.data).toEqual([mockPermission]);
    expect(mockAssignRolePermissions).toHaveBeenCalledWith("r-1", ["projects.read"]);
  });

  // --- 批量更新角色权限 ---
  it("updateRolePermissions 新增方向无权限返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addPermissionCodes: ["projects.read"], removePermissionCodes: [] }),
    });
    expect(res.status).toBe(403);
  });

  it("updateRolePermissions 只有撤销时把差量交给 service", async () => {
    authed();
    mockUpdateRolePermissions.mockResolvedValue([mockPermission]);

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addPermissionCodes: [], removePermissionCodes: ["projects.read"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: typeof mockPermission[] };
    expect(body.data).toEqual([mockPermission]);
    expect(mockUpdateRolePermissions).toHaveBeenCalledWith("r-1", [], ["projects.read"]);
  });

  it("updateRolePermissions 增删混合时缺少任一写权限返回 403", async () => {
    authed();
    mockCheck.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addPermissionCodes: ["projects.read"], removePermissionCodes: ["permissions.read"] }),
    });
    expect(res.status).toBe(403);
    expect(mockUpdateRolePermissions).toHaveBeenCalledWith("r-1", ["projects.read"], ["permissions.read"]);
  });

  it("updateRolePermissions 返回角色当前权限列表", async () => {
    authed();
    mockUpdateRolePermissions.mockResolvedValue([mockPermission]);

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addPermissionCodes: ["projects.read"], removePermissionCodes: ["permissions.read"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: typeof mockPermission[] };
    expect(body.data).toEqual([mockPermission]);
    expect(mockUpdateRolePermissions).toHaveBeenCalledWith("r-1", ["projects.read"], ["permissions.read"]);
  });

  it("updateRolePermissions service 抛 ROLE_NOT_FOUND 返回 404", async () => {
    authed();
    mockUpdateRolePermissions.mockRejectedValue(new AppError("ROLE_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1/permissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addPermissionCodes: ["projects.read"], removePermissionCodes: [] }),
    });
    expect(res.status).toBe(404);
  });

  // --- 撤角色权限 ---
  it("deleteRolePermission 无 roles.revoke-permissions 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/roles/r-1/permissions/projects.read", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteRolePermission 有 roles.revoke-permissions 调 service 返回 200", async () => {
    authed();
    mockDeleteRolePermission.mockResolvedValue(undefined);

    const res = await buildApp().request("/roles/r-1/permissions/projects.read", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { permissionCode: string } };
    expect(body.data.permissionCode).toBe("projects.read");
    expect(mockDeleteRolePermission).toHaveBeenCalledWith("r-1", "projects.read");
  });

  it("deleteRolePermission service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteRolePermission.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1/permissions/projects.read", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
