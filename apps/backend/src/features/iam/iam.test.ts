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
  mockCreateRole,
  mockDeleteRole,
  mockListRolePermissions,
  mockAssignRolePermissions,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockListPermissions: vi.fn(),
  mockListRoles: vi.fn(),
  mockCreateRole: vi.fn(),
  mockDeleteRole: vi.fn(),
  mockListRolePermissions: vi.fn(),
  mockAssignRolePermissions: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("./service.js", () => ({
  IamService: {
    listPermissions: mockListPermissions,
    listRoles: mockListRoles,
    createRole: mockCreateRole,
    deleteRole: mockDeleteRole,
    listRolePermissions: mockListRolePermissions,
    assignRolePermissions: mockAssignRolePermissions,
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

function buildApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.openapi(routes.listPermissionsRoute, handlers.listPermissionsHandler);
  app.openapi(routes.listRolesRoute, handlers.listRolesHandler);
  app.openapi(routes.createRoleRoute, handlers.createRoleHandler);
  app.openapi(routes.deleteRoleRoute, handlers.deleteRoleHandler);
  app.openapi(routes.listRolePermissionsRoute, handlers.listRolePermissionsHandler);
  app.openapi(routes.assignRolePermissionsRoute, handlers.assignRolePermissionsHandler);
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

  it("listRoles 有 iam.read 返回角色列表", async () => {
    authed();
    mockListRoles.mockResolvedValue([mockRole]);

    const res = await buildApp().request("/roles");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { name: string }[] };
    expect(body.data[0].name).toBe("viewer");
  });

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

  it("deleteRole service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteRole.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/roles/r-1", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(mockDeleteRole).toHaveBeenCalledWith("r-1");
  });

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
});
