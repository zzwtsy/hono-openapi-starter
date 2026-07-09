import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "@/core/http/context.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const { mockDbExecute } = vi.hoisted(() => ({ mockDbExecute: vi.fn() }));

vi.mock("@/db/client.js", () => ({ db: { execute: mockDbExecute } }));
vi.mock("@/core/logger/index.js", () => ({
  logger: { withError: () => ({ warn: vi.fn() }) },
}));

function buildApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.openapi(routes.getHealthzRoute, handlers.getHealthzHandler);
  app.openapi(routes.getReadyzRoute, handlers.getReadyzHandler);
  app.onError((err, c) => {
    const status = err instanceof AppError ? err.status : 500;
    return c.json({ code: err instanceof AppError ? err.code : "ERROR" }, status as ContentfulStatusCode);
  });
  return app;
}

describe("health probes", () => {
  beforeEach(() => {
    mockDbExecute.mockReset();
  });

  it("healthz 返回 200 ok(不查 DB)", async () => {
    const res = await buildApp().request("/healthz");

    expect(res.status).toBe(200);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe("ok");
    expect(mockDbExecute).not.toHaveBeenCalled();
  });

  it("readyz DB 正常返回 200 ready", async () => {
    mockDbExecute.mockResolvedValue([]);

    const res = await buildApp().request("/readyz");

    expect(res.status).toBe(200);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe("ready");
  });

  it("readyz DB 失败返回 503", async () => {
    mockDbExecute.mockRejectedValue(new Error("conn refused"));

    const res = await buildApp().request("/readyz");

    expect(res.status).toBe(503);
  });
});
