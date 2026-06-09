import type { ErrorEnvelope, SuccessEnvelope } from "./core/http/response.js";
import { describe, expect, it } from "vitest";

import { createApp } from "./core/app/create-app.js";

interface HealthData {
  status: "ok";
}

interface OpenApiDocument {
  paths: Record<string, {
    get?: {
      operationId?: string;
      tags?: string[];
    };
  }>;
}

async function readJson<TBody>(res: Response) {
  return res.json() as Promise<TBody>;
}

describe("backend app", () => {
  it("returns the health envelope with a generated request id", async () => {
    const app = createApp();
    const res = await app.request("/api/health");
    const body = await readJson<SuccessEnvelope<HealthData>>(res);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Request-Id")).toEqual(expect.any(String));
    expect(typeof body.meta.requestId).toBe("string");
    expect(body).toStrictEqual({
      success: true,
      code: "COMMON_OK",
      message: "OK",
      data: {
        status: "ok",
      },
      error: null,
      meta: {
        requestId: body.meta.requestId,
      },
    });
    expect(body.meta.requestId).toBe(res.headers.get("X-Request-Id"));
  });

  it("reuses an incoming request id", async () => {
    const app = createApp();
    const res = await app.request("/health", {
      headers: {
        "X-Request-Id": "req_test_123",
      },
    });
    const body = await readJson<SuccessEnvelope<HealthData>>(res);

    expect(res.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(body.meta.requestId).toBe("req_test_123");
  });

  it("returns the not found envelope for unknown routes", async () => {
    const app = createApp();
    const res = await app.request("/missing");
    const body = await readJson<ErrorEnvelope>(res);

    expect(res.status).toBe(404);
    expect(typeof body.meta.requestId).toBe("string");
    expect(body).toStrictEqual({
      success: false,
      code: "COMMON_NOT_FOUND",
      message: "Resource not found",
      data: null,
      error: {
        type: "business",
      },
      meta: {
        requestId: body.meta.requestId,
      },
    });
  });

  it("exposes the health route in the OpenAPI document", async () => {
    const app = createApp();
    const res = await app.request("/openapi.json");
    const document = await readJson<OpenApiDocument>(res);

    expect(res.status).toBe(200);
    expect(document.paths["/health"]?.get?.operationId).toBe("getHealth");
    expect(document.paths["/health"]?.get?.tags).toContain("Health");
  });
});
