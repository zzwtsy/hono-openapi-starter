import type { Context } from "hono";
import type { AppBindings } from "./context.js";
import { z } from "@hono/zod-openapi";
import { describe, expect, it } from "vitest";
import { createSuccessEnvelopeSchema, ErrorEnvelopeSchema } from "./openapi/components.js";
import { errorResponse, successResponse } from "./response.js";

interface MockResponse {
  body: unknown;
  status: number;
}

// 构造最小 context：response helper 只用到 c.get("requestId") 与 c.json。
function mockContext(requestId = "req_test") {
  return {
    get: (key: string) => (key === "requestId" ? requestId : undefined),
    json: (body: unknown, status: number): MockResponse => ({ body, status }),
  } as unknown as Context<AppBindings>;
}

describe("successResponse", () => {
  it("返回 200 且 body 符合 SuccessEnvelope schema", () => {
    const dataSchema = z.object({ status: z.literal("ok") });
    const { body, status } = successResponse(mockContext(), { status: "ok" }) as MockResponse;

    expect(status).toBe(200);
    expect(createSuccessEnvelopeSchema(dataSchema).safeParse(body).success).toBe(true);
  });

  it("meta.requestId 取自 context", () => {
    const { body } = successResponse(mockContext("req_abc"), { status: "ok" }) as MockResponse;

    expect((body as { meta: { requestId: string } }).meta.requestId).toBe("req_abc");
  });
});

describe("errorResponse", () => {
  it("返回 registry 中的 status 且 body 符合 ErrorEnvelope schema", () => {
    const { body, status } = errorResponse(mockContext(), "COMMON_NOT_FOUND") as MockResponse;

    expect(status).toBe(404);
    expect(ErrorEnvelopeSchema.safeParse(body).success).toBe(true);
  });

  it("未暴露错误不透传调用方 message", () => {
    const { body } = errorResponse(mockContext(), "COMMON_INTERNAL_ERROR", {
      message: "内部堆栈细节",
    }) as MockResponse;

    expect((body as { message: string }).message).toBe("Internal server error");
  });

  it("未暴露错误不透传调用方 details", () => {
    const { body } = errorResponse(mockContext(), "COMMON_INTERNAL_ERROR", {
      details: { stack: "at db.query (internal.ts:42)" },
    }) as MockResponse;

    expect((body as { error: { details?: unknown } }).error.details).toBeUndefined();
  });

  it("暴露错误透传调用方 details", () => {
    const { body } = errorResponse(mockContext(), "COMMON_VALIDATION_FAILED", {
      details: [{ path: ["email"], message: "邮箱格式无效" }],
    }) as MockResponse;

    expect((body as { error: { details?: unknown } }).error.details).toEqual([
      { path: ["email"], message: "邮箱格式无效" },
    ]);
  });
});
