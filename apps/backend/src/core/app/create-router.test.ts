import { createRoute, z } from "@hono/zod-openapi";
import { describe, expect, it, vi } from "vitest";

import { createRouter } from "./create-router.js";

describe("createRouter", () => {
  it("未知 permissionCode 返回 400 PERMISSION_CODE_INVALID", async () => {
    const warn = vi.fn();
    const mockLogger = {
      withMetadata: () => ({
        withError: () => ({ warn }),
      }),
    };
    const app = createRouter();
    app.use("*", async (c, next) => {
      c.set("logger", mockLogger as never);
      c.set("requestId", "request-test");
      await next();
    });

    // 真实 IAM route 使用 catalog 派生 enum；这里用等价的最小 schema 隔离 core 测试与 feature 依赖边界。
    const permissionCodeSchema = z.enum(["projects.read"]);
    const route = createRoute({
      method: "get",
      path: "/permissions/{permissionCode}",
      request: { params: z.object({ permissionCode: permissionCodeSchema }) },
      responses: {
        200: {
          description: "ok",
          content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
        },
      },
    });
    app.openapi(route, c => c.json({ ok: true }, 200));

    const response = await app.request("/permissions/not-registered.read");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      code: "PERMISSION_CODE_INVALID",
    });
    expect(warn).toHaveBeenCalledOnce();
  });
});
