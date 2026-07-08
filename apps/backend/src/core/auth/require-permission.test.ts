import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "../http/context.js";
import type { AuthVariables } from "./context.js";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "../errors/app-error.js";
import { requirePermission } from "./require-permission.js";

// mock PermissionService.check(用 vi.hoisted 持有 vi.fn,避免 method 引用 unbound-method)。
const { mockCheck } = vi.hoisted(() => ({ mockCheck: vi.fn() }));
vi.mock("../authorization/index.js", () => ({
  PermissionService: { check: mockCheck },
}));

// 测试用真实权限 projects.read(来自 manifest),mock PermissionService 不实际查 DB。
interface MockUser {
  id: string;
  orgId: string | null;
}

function buildApp(user?: MockUser, requirePermissionOptions?: { orgId?: string }) {
  const app = new Hono<AppBindings>();
  app.use("/protected", async (c, next) => {
    if (user) {
      c.set("user", user as unknown as AuthVariables["user"]);
    }
    await next();
  });
  app.use("/protected", requirePermission("projects.read", requirePermissionOptions));
  app.get("/protected", c => c.json({ ok: true }));
  app.onError((err, c) => {
    const status = err instanceof AppError ? err.status : 500;
    return c.json({ code: err instanceof AppError ? err.code : "ERROR" }, status as ContentfulStatusCode);
  });
  return app;
}

describe("requirePermission", () => {
  it("user 不存在时抛 COMMON_UNAUTHORIZED(requireAuth 应已跑)", async () => {
    const res = await buildApp().request("/protected");

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "COMMON_UNAUTHORIZED" });
  });

  it("user.orgId 为 null 时抛 COMMON_FORBIDDEN(无组织无权限)", async () => {
    const res = await buildApp({ id: "u-1", orgId: null }).request("/protected");

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "COMMON_FORBIDDEN" });
  });

  it("check 返回 true 时放行", async () => {
    mockCheck.mockResolvedValue(true);

    const res = await buildApp({ id: "u-1", orgId: "org-1" }).request("/protected");

    expect(res.status).toBe(200);
  });

  it("check 返回 false 时抛 COMMON_FORBIDDEN", async () => {
    mockCheck.mockResolvedValue(false);

    const res = await buildApp({ id: "u-1", orgId: "org-1" }).request("/protected");

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "COMMON_FORBIDDEN" });
  });

  it("默认 orgId 取自 user.orgId", async () => {
    mockCheck.mockResolvedValue(true);

    await buildApp({ id: "u-1", orgId: "org-1" }).request("/protected");

    expect(mockCheck).toHaveBeenCalledWith("u-1", "projects.read", "org-1");
  });

  it("显式 orgId 覆盖 user.orgId", async () => {
    mockCheck.mockResolvedValue(true);

    await buildApp({ id: "u-1", orgId: "org-1" }, { orgId: "other-org" }).request("/protected");

    expect(mockCheck).toHaveBeenCalledWith("u-1", "projects.read", "other-org");
  });
});
