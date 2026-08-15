import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import {
  buildIamApp,
  mockSession,
  mockUser,
} from "../../../tests/helpers/iam-route-test-helpers.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const {
  mockGetSession,
  mockCheck,
  mockListUsers,
  mockCreateUser,
  mockUpdateUser,
  mockResetPassword,
  mockDisableUser,
  mockEnableUser,
  mockTransferUserOrganization,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockListUsers: vi.fn(),
  mockCreateUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockResetPassword: vi.fn(),
  mockDisableUser: vi.fn(),
  mockEnableUser: vi.fn(),
  mockTransferUserOrganization: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("../../core/audit/index.js", async () => ({
  audit: (await import("../../../tests/helpers/audit-passthrough.js")).auditPassthrough,
}));
vi.mock("./service.js", () => ({
  IamService: {
    listUsers: mockListUsers,
    createUser: (_actor: unknown, input: unknown) => mockCreateUser("org-1", input) as unknown,
    updateUser: (_actor: unknown, userId: string, input: unknown) => mockUpdateUser("org-1", userId, input) as unknown,
    resetPassword: (_actor: unknown, userId: string, password: string) => mockResetPassword("org-1", userId, password) as unknown,
    disableUser: (_actor: unknown, userId: string) => mockDisableUser("org-1", "u-1", userId) as unknown,
    enableUser: (_actor: unknown, userId: string) => mockEnableUser("org-1", userId) as unknown,
    transferUserOrganization: (_actor: unknown, userId: string, orgId: string, clearAllGrants?: boolean) => mockTransferUserOrganization("org-1", "u-1", userId, orgId, clearAllGrants) as unknown,
  },
}));

function buildApp() {
  return buildIamApp((app) => {
    app.openapi(routes.listUsersRoute, handlers.listUsersHandler);
    app.openapi(routes.createUserRoute, handlers.createUserHandler);
    app.openapi(routes.updateUserRoute, handlers.updateUserHandler);
    app.openapi(routes.resetUserPasswordRoute, handlers.resetUserPasswordHandler);
    app.openapi(routes.disableUserRoute, handlers.disableUserHandler);
    app.openapi(routes.enableUserRoute, handlers.enableUserHandler);
    app.openapi(routes.transferUserOrganizationRoute, handlers.transferUserOrganizationHandler);
  });
}

function authed() {
  mockGetSession.mockResolvedValue({ user: mockUser as never, session: mockSession as never });
  mockCheck.mockResolvedValue(true);
}

describe("IAM user routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const requirePermission = async (permissionCode: string) => {
      const allowed = await mockCheck("u-1", permissionCode, "org-1") as boolean;
      if (!allowed) {
        throw new AppError("COMMON_FORBIDDEN");
      }
    };
    mockCreateUser.mockImplementation(async () => requirePermission("users.create"));
    mockUpdateUser.mockImplementation(async () => requirePermission("users.update"));
    mockResetPassword.mockImplementation(async () => requirePermission("users.reset-password"));
    mockDisableUser.mockImplementation(async () => requirePermission("users.disable"));
    mockEnableUser.mockImplementation(async () => requirePermission("users.enable"));
    mockTransferUserOrganization.mockImplementation(async () => requirePermission("users.update"));
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
      body: JSON.stringify({ email: "new@example.com", password: "password-123", name: "b", orgId: "org-1" }),
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
    mockDisableUser.mockRejectedValue(new AppError("USER_CANNOT_DISABLE_SELF"));

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

  // --- 调岗 ---
  it("transferUserOrganization 无 users.update 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/users/u-2/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-2" }),
    });
    expect(res.status).toBe(403);
  });

  it("transferUserOrganization 有权限时传 actorUserId+body 调 service", async () => {
    authed();
    mockTransferUserOrganization.mockResolvedValue({ ...mockUserSummary, orgId: "org-2" });

    const res = await buildApp().request("/users/u-2/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-2" }),
    });
    expect(res.status).toBe(200);
    expect(mockTransferUserOrganization).toHaveBeenCalledWith("org-1", "u-1", "u-2", "org-2", undefined);
  });

  it("transferUserOrganization 传 clearAllGrants=true", async () => {
    authed();
    mockTransferUserOrganization.mockResolvedValue({ ...mockUserSummary, orgId: "org-2" });

    const res = await buildApp().request("/users/u-2/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-2", clearAllGrants: true }),
    });
    expect(res.status).toBe(200);
    expect(mockTransferUserOrganization).toHaveBeenCalledWith("org-1", "u-1", "u-2", "org-2", true);
  });

  it("transferUserOrganization service 抛 FORBIDDEN(自调岗)返回 403", async () => {
    authed();
    mockTransferUserOrganization.mockRejectedValue(new AppError("USER_CANNOT_TRANSFER_SELF"));

    const res = await buildApp().request("/users/u-1/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-2" }),
    });
    expect(res.status).toBe(403);
  });

  it("transferUserOrganization service 抛 ORG_SAME_AS_CURRENT 返回 409", async () => {
    authed();
    mockTransferUserOrganization.mockRejectedValue(new AppError("ORG_SAME_AS_CURRENT"));

    const res = await buildApp().request("/users/u-2/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("transferUserOrganization service 抛 USER_TRANSFER_CONFLICT(并发)返回 409", async () => {
    authed();
    mockTransferUserOrganization.mockRejectedValue(new AppError("USER_TRANSFER_CONFLICT"));

    const res = await buildApp().request("/users/u-2/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "org-2" }),
    });
    expect(res.status).toBe(409);
  });
});
