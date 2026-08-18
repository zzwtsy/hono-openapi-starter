import { beforeEach, describe, expect, it, vi } from "vitest";

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
  mockListPermissions,
  mockGetMyAuthorization,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockListPermissions: vi.fn(),
  mockGetMyAuthorization: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("../../core/audit/index.js", async () => ({
  audit: (await import("../../../tests/helpers/audit-passthrough.js")).auditPassthrough,
}));
vi.mock("./service.js", () => ({
  IamService: {
    listPermissions: mockListPermissions,
    getMyAuthorization: (userId: string, orgId: string) => mockGetMyAuthorization(userId, orgId) as unknown,
  },
}));

function buildApp() {
  return buildIamApp((app) => {
    app.openapi(routes.listPermissionsRoute, handlers.listPermissionsHandler);
    app.openapi(routes.getMyAuthorizationRoute, handlers.getMyAuthorizationHandler);
    app.openapi(routes.listUsersRoute, handlers.listUsersHandler);
    app.openapi(routes.createUserRoute, handlers.createUserHandler);
    app.openapi(routes.updateUserRoute, handlers.updateUserHandler);
    app.openapi(routes.resetUserPasswordRoute, handlers.resetUserPasswordHandler);
    app.openapi(routes.disableUserRoute, handlers.disableUserHandler);
    app.openapi(routes.enableUserRoute, handlers.enableUserHandler);
    app.openapi(routes.transferUserOrganizationRoute, handlers.transferUserOrganizationHandler);
    app.openapi(routes.listRolesRoute, handlers.listRolesHandler);
    app.openapi(routes.createRoleRoute, handlers.createRoleHandler);
    app.openapi(routes.updateRoleRoute, handlers.updateRoleHandler);
    app.openapi(routes.deleteRoleRoute, handlers.deleteRoleHandler);
    app.openapi(routes.listRolePermissionsRoute, handlers.listRolePermissionsHandler);
    app.openapi(routes.assignRolePermissionsRoute, handlers.assignRolePermissionsHandler);
    app.openapi(routes.updateRolePermissionsRoute, handlers.updateRolePermissionsHandler);
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
  });
}

function authed() {
  mockGetSession.mockResolvedValue({ user: mockUser as never, session: mockSession as never });
  mockCheck.mockResolvedValue(true);
}

describe("IAM authentication and self-authorization routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 权限目录。
  it("listPermissions 无 permissions.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/permissions");
    expect(res.status).toBe(403);
  });

  it("listPermissions 有 permissions.read 返回权限目录", async () => {
    authed();
    mockListPermissions.mockResolvedValue([mockPermission]);

    const res = await buildApp().request("/permissions");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { code: string }[] };
    expect(body.data[0].code).toBe("projects.read");
  });

  // 当前用户授权自查。
  it("getMyAuthorization 未认证返回 401", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await buildApp().request("/me/authorization");
    expect(res.status).toBe(401);
    expect(mockGetMyAuthorization).not.toHaveBeenCalled();
  });

  it("getMyAuthorization 只需认证且返回授权来源", async () => {
    authed();
    mockCheck.mockResolvedValue(false);
    mockGetMyAuthorization.mockResolvedValue({
      orgId: "org-1",
      roles: [{ roleId: "r-1", roleName: "viewer", orgId: "org-1", expiresAt: null }],
      directPermissions: [{ permission: mockPermission, effect: "deny", orgId: "org-1", expiresAt: null }],
      effective: {
        effective: [{ permissionCode: "projects.read", sources: [{ type: "role", roleId: "r-1", roleName: "viewer", orgId: "org-1", expiresAt: null }] }],
        denied: [],
      },
    });

    const res = await buildApp().request("/me/authorization");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { orgId: string; roles: unknown[]; directPermissions: unknown[]; effective: { effective: unknown[] } } };
    expect(body.data.orgId).toBe("org-1");
    expect(body.data.roles).toHaveLength(1);
    expect(body.data.directPermissions).toHaveLength(1);
    expect(body.data.effective.effective).toHaveLength(1);
    expect(mockGetMyAuthorization).toHaveBeenCalledWith("u-1", "org-1");
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("getMyAuthorization 读取到 null orgId 返回内部错误", async () => {
    mockGetSession.mockResolvedValue({ user: { ...mockUser, orgId: null } as never, session: mockSession as never });

    const res = await buildApp().request("/me/authorization");
    expect(res.status).toBe(500);
    expect(mockGetMyAuthorization).not.toHaveBeenCalled();
  });

  // 无 session 返回 401。
  // requireAuth 是所有 iam 端点的首个中间件,无 session 时统一 401(先于权限检查与 body 校验)。
  // 参数化覆盖此处列出的全部 IAM 端点，验证 requireAuth 的 401 链路。
  const unauthCases: Array<[string, string, string]> = [
    ["get", "/permissions", ""],
    ["get", "/me/authorization", ""],
    ["get", "/roles", ""],
    ["post", "/roles", "{}"],
    ["patch", "/roles/r-1", "{}"],
    ["delete", "/roles/r-1", ""],
    ["get", "/roles/r-1/permissions", ""],
    ["post", "/roles/r-1/permissions", "{\"permissionCodes\":[]}"],
    ["delete", "/roles/r-1/permissions/projects.read", ""],
    ["get", "/users", ""],
    ["post", "/users", "{}"],
    ["patch", "/users/u-1", "{}"],
    ["post", "/users/u-1/reset-password", "{}"],
    ["post", "/users/u-1/disable", ""],
    ["post", "/users/u-1/enable", ""],
    ["patch", "/users/u-1/organization", "{\"orgId\":\"org-root\"}"],
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
  it.for(unauthCases)("无 session 时 %s %s 返回 401", async ([method, path, body]) => {
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
