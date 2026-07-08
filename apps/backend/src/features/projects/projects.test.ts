import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "@/core/http/context.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

// mock 依赖:session(requireAuth)、PermissionService(requirePermission)、ProjectService(handler)
// 用 vi.hoisted 持有 vi.fn,避免 method 引用 unbound-method;避免加载真实 better-auth / db-client(触发 env 校验)
const { mockGetSession, mockCheck, mockList, mockGetById } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockList: vi.fn(),
  mockGetById: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("./service.js", () => ({ ProjectService: { list: mockList, getById: mockGetById } }));

const mockUser = { id: "u-1", orgId: "org-1", email: "a@b.c", name: "a" };
const mockSession = { id: "s-1", userId: "u-1", token: "t" };
const mockProject = {
  id: "proj-1",
  name: "官网改版",
  description: null,
  orgId: "org-1",
  createdAt: new Date("2026-07-07T00:00:00.000Z"),
  updatedAt: new Date("2026-07-07T00:00:00.000Z"),
};

/** 构造挂载 projects 路由的 app,错误转 status 便于断言。 */
function buildApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.openapi(routes.listProjectsRoute, handlers.listProjectsHandler);
  app.openapi(routes.getProjectRoute, handlers.getProjectHandler);
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

describe("projects routes", () => {
  // 每个用例前重置 mock 实现,避免 mockResolvedValue 跨用例残留导致顺序依赖(漏 setup 时报 403 而非假通过)。
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("无 session 时 list 返回 401", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await buildApp().request("/projects");

    expect(res.status).toBe(401);
  });

  it("有 session 但无权限时 list 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/projects");

    expect(res.status).toBe(403);
  });

  it("有权限时 list 返回项目列表 envelope", async () => {
    authed();
    mockList.mockResolvedValue([mockProject]);

    const res = await buildApp().request("/projects");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string }[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("proj-1");
    expect(mockList).toHaveBeenCalledWith("org-1");
  });

  it("detail 不存在时返回 404", async () => {
    authed();
    mockGetById.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/projects/proj-999");

    expect(res.status).toBe(404);
    expect(mockGetById).toHaveBeenCalledWith("proj-999", "org-1");
  });

  it("detail 存在时返回项目 envelope", async () => {
    authed();
    mockGetById.mockResolvedValue(mockProject);

    const res = await buildApp().request("/projects/proj-1");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("proj-1");
  });
});
