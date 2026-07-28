import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "@/core/http/context.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

// mock 依赖:session(requireAuth)、PermissionService.listEffectivePermissions(handler)、MeService(updateMe/changeMyPassword)
const { mockGetSession, mockListEffective, mockUpdateMe, mockChangeMyPassword } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockListEffective: vi.fn(),
  mockUpdateMe: vi.fn(),
  mockChangeMyPassword: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({
  PermissionService: { listEffectivePermissions: mockListEffective },
}));
vi.mock("./service.js", () => ({
  MeService: { updateMe: mockUpdateMe, changeMyPassword: mockChangeMyPassword },
}));

const mockUser = { id: "u-1", orgId: "org-1", email: "a@b.c", name: "a" };
const mockSession = { id: "s-1", userId: "u-1", token: "t" };

function buildApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.openapi(routes.getMeRoute, handlers.getMeHandler);
  app.openapi(routes.updateMeRoute, handlers.updateMeHandler);
  app.openapi(routes.changeMyPasswordRoute, handlers.changeMyPasswordHandler);
  app.onError((err, c) => {
    const status = err instanceof AppError ? err.status : 500;
    return c.json({ code: err instanceof AppError ? err.code : "ERROR" }, status as ContentfulStatusCode);
  });
  return app;
}

function authed(user: { id: string; name: string; email: string; orgId: string | null } = mockUser) {
  mockGetSession.mockResolvedValue({ user: user as never, session: mockSession as never });
}

describe("me routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("无 session 时返回 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await buildApp().request("/me");
    expect(res.status).toBe(401);
  });

  it("已绑定组织时返回 user + 有效权限全集", async () => {
    authed();
    mockListEffective.mockResolvedValue({
      effective: [
        { permission: "projects.read", sources: [] },
        { permission: "organizations.read", sources: [] },
      ],
      denied: [],
    });

    const res = await buildApp().request("/me");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { user: { id: string; orgId: string }; permissions: string[] } };
    expect(body.success).toBe(true);
    expect(body.data.user.id).toBe("u-1");
    expect(body.data.user.orgId).toBe("org-1");
    expect(body.data.permissions).toEqual(["projects.read", "organizations.read"]);
    expect(mockListEffective).toHaveBeenCalledWith("u-1", "org-1");
  });

  it("未绑定组织时 permissions 为空,不查权限", async () => {
    authed({ ...mockUser, orgId: null });

    const res = await buildApp().request("/me");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { user: { orgId: string | null }; permissions: string[] } };
    expect(body.data.user.orgId).toBe(null);
    expect(body.data.permissions).toEqual([]);
    expect(mockListEffective).not.toHaveBeenCalled();
  });

  // --- updateMe(PATCH /me)---

  it("updateMe:未认证返回 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await buildApp().request("/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "new-name" }),
    });
    expect(res.status).toBe(401);
  });

  it("updateMe:改显示名返回更新后的用户", async () => {
    authed();
    mockUpdateMe.mockResolvedValue({ id: "u-1", name: "新名字", email: "a@b.c", orgId: "org-1" });

    const res = await buildApp().request("/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新名字" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { name: string } };
    expect(body.data.name).toBe("新名字");
    expect(mockUpdateMe).toHaveBeenCalledWith("u-1", { name: "新名字" });
  });

  // --- changeMyPassword(POST /me/password)---

  it("changeMyPassword:未认证返回 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await buildApp().request("/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "old", newPassword: "new-password" }),
    });
    expect(res.status).toBe(401);
  });

  it("changeMyPassword:当前密码错误返回 401", async () => {
    authed();
    mockChangeMyPassword.mockRejectedValue(new AppError("USER_INVALID_PASSWORD"));

    const res = await buildApp().request("/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "wrong", newPassword: "new-password" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("USER_INVALID_PASSWORD");
  });

  it("changeMyPassword:成功返回 200", async () => {
    authed();
    mockChangeMyPassword.mockResolvedValue(undefined);

    const res = await buildApp().request("/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "old-password", newPassword: "new-password-123" }),
    });
    expect(res.status).toBe(200);
    expect(mockChangeMyPassword).toHaveBeenCalledWith(
      "u-1",
      "old-password",
      "new-password-123",
      expect.any(Headers),
    );
  });
});
