import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "../http/context.js";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "../errors/app-error.js";

import { requireAuth } from "./require-auth.js";
import { getSession } from "./session.js";

// 替换 session 模块,避免加载真实 Better Auth 实例(其 import 会触发 env 校验)。
vi.mock("./session.js", () => ({
  getSession: vi.fn(),
}));

const mockGetSession = vi.mocked(getSession);

const mockUser = { id: "u-1", email: "a@b.c", name: "a" };
const mockSession = { id: "s-1", userId: "u-1", token: "t" };

/** 构造最小 Hono app:挂 requireAuth + 探针 handler,错误转 status 便于断言。 */
function buildApp() {
  const app = new Hono<AppBindings>();
  app.use("/protected", requireAuth());
  app.get("/protected", c => c.json({ userId: c.get("user")?.id }));
  app.onError((err, c) => {
    const status = err instanceof AppError ? err.status : 500;
    return c.json({ code: err instanceof AppError ? err.code : "ERROR" }, status as ContentfulStatusCode);
  });
  return app;
}

describe("requireAuth", () => {
  it("无 session 时返回 401 COMMON_UNAUTHORIZED", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await buildApp().request("/protected");

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "COMMON_UNAUTHORIZED" });
  });

  it("session 不完整(缺 user 或 session)时同样 401", async () => {
    mockGetSession.mockResolvedValue({ user: null, session: null } as never);

    const res = await buildApp().request("/protected");

    expect(res.status).toBe(401);
  });

  it("有 session 时注入 user 并放行", async () => {
    mockGetSession.mockResolvedValue({ user: mockUser, session: mockSession } as never);

    const res = await buildApp().request("/protected");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ userId: "u-1" });
  });

  it("透传请求 headers 给 getSession", async () => {
    mockGetSession.mockResolvedValue({ user: mockUser, session: mockSession } as never);

    await buildApp().request("/protected", {
      headers: { authorization: "Bearer token-xyz" },
    });

    expect(mockGetSession).toHaveBeenCalledWith(expect.any(Headers));
  });
});
