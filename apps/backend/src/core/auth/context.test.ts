import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "@/core/http/context.js";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import { requireOrgUser } from "./context.js";

/** 构造挂载 requireOrgUser 的 app,error 转 status 便于断言。 */
function buildApp(user: unknown) {
  const app = new Hono<AppBindings>();
  app.get("/x", (c) => {
    if (user !== undefined) {
      c.set("user", user as never);
    }
    const { id, orgId } = requireOrgUser(c);
    return c.json({ id, orgId });
  });
  app.onError((err, c) => {
    const status = err instanceof AppError ? err.status : 500;
    return c.json({ code: err instanceof AppError ? err.code : "ERROR" }, status as ContentfulStatusCode);
  });
  return app;
}

describe("requireOrgUser", () => {
  it("user 缺失 -> COMMON_UNAUTHORIZED 401", async () => {
    const res = await buildApp(undefined).request("/x");

    expect(res.status).toBe(401);
  });

  it("user.orgId 为 null -> 403", async () => {
    const res = await buildApp({ id: "u", orgId: null }).request("/x");

    expect(res.status).toBe(403);
  });

  it("user 与 orgId 齐全 -> 返回 {id, orgId}", async () => {
    const res = await buildApp({ id: "u-1", orgId: "org-1" }).request("/x");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "u-1", orgId: "org-1" });
  });
});
