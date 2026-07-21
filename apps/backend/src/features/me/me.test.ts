import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "@/core/http/context.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

// mock 依赖:session(requireAuth)、PermissionService.listEffectivePermissions(handler)
const { mockGetSession, mockListEffective } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockListEffective: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({
  PermissionService: { listEffectivePermissions: mockListEffective },
}));

const mockUser = { id: "u-1", orgId: "org-1", email: "a@b.c", name: "a" };
const mockSession = { id: "s-1", userId: "u-1", token: "t" };

function buildApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.openapi(routes.getMeRoute, handlers.getMeHandler);
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
    mockListEffective.mockResolvedValue(["projects.read", "organizations.read"]);

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
});
