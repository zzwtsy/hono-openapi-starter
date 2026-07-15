import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "@/core/http/context.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

// mock 依赖:session(requireAuth)、PermissionService(requirePermission)、SystemSettingService(handler)
const { mockGetSession, mockCheck, mockList, mockUpsert } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockList: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("./service.js", () => ({
  SystemSettingService: {
    list: mockList,
    upsert: mockUpsert,
  },
}));

const mockUser = { id: "u-1", orgId: "org-1", email: "a@b.c", name: "a" };
const mockSession = { id: "s-1", userId: "u-1", token: "t" };
const mockSetting = {
  key: "signUp",
  value: { enabled: true },
  updatedAt: new Date("2026-07-15T00:00:00.000Z"),
  updatedByUserId: "u-1",
};

/** 构造挂载 system-settings 路由的 app,错误转 status 便于断言。 */
function buildApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.openapi(routes.listSettingsRoute, handlers.listSettingsHandler);
  app.openapi(routes.updateSettingRoute, handlers.updateSettingHandler);
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

function jsonInit(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

describe("system-settings routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // --- list ---
  it("无 session 时 list 返回 401", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await buildApp().request("/settings");

    expect(res.status).toBe(401);
  });

  it("有 session 但无权限时 list 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/settings");

    expect(res.status).toBe(403);
  });

  it("有权限时 list 返回配置列表 envelope", async () => {
    authed();
    mockList.mockResolvedValue([mockSetting]);

    const res = await buildApp().request("/settings");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { key: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].key).toBe("signUp");
    expect(mockList).toHaveBeenCalledWith();
  });

  // --- update ---
  it("无权限时 update 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/settings/signUp", { ...jsonInit({ value: { enabled: false } }), method: "PATCH" });

    expect(res.status).toBe(403);
  });

  it("有权限时 update 走 upsert 并按 key+value+userId 调用 service", async () => {
    authed();
    mockUpsert.mockResolvedValue({ ...mockSetting, value: { enabled: false } });

    const res = await buildApp().request("/settings/signUp", { ...jsonInit({ value: { enabled: false } }), method: "PATCH" });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { value: { enabled: boolean } } };
    expect(body.data.value.enabled).toBe(false);
    expect(mockUpsert).toHaveBeenCalledWith("signUp", { enabled: false }, "u-1");
  });

  it("传错误结构 value(enabled 为字符串)时返回 400", async () => {
    authed();

    const res = await buildApp().request("/settings/signUp", { ...jsonInit({ value: { enabled: "yes" } }), method: "PATCH" });

    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("传未知 key 时返回 400", async () => {
    authed();

    const res = await buildApp().request("/settings/unknownKey", { ...jsonInit({ value: { enabled: true } }), method: "PATCH" });

    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
