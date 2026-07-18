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

// 构造最小 context：response helper 只用到 c.get("requestId")/c.get("locale") 与 c.json。
function mockContext(requestId = "req_test", locale?: "en" | "zh") {
  return {
    get: (key: string) => {
      if (key === "requestId") {
        return requestId;
      }
      if (key === "locale") {
        return locale;
      }
      return undefined;
    },
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

  it("未暴露错误不透传调用方 details", () => {
    // 未暴露错误(COMMON_INTERNAL_ERROR)即使传入 details 也不透传到响应体(B1 D1)。
    const { body } = errorResponse(mockContext(), "COMMON_INTERNAL_ERROR", {
      details: [{ path: ["internal"], message: "内部错误细节" }],
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

  it("expose 错误按 locale 返回本地化 message(i18n)", () => {
    const { body: enBody } = errorResponse(mockContext("r", "en"), "COMMON_NOT_FOUND") as MockResponse;
    expect((enBody as { message: string }).message).toBe("Resource not found");

    const { body: zhBody } = errorResponse(mockContext("r", "zh"), "COMMON_NOT_FOUND") as MockResponse;
    expect((zhBody as { message: string }).message).toBe("资源不存在");
  });

  it("originalMessage 恒为 en(defaultMessage)", () => {
    const { body } = errorResponse(mockContext("r", "zh"), "COMMON_NOT_FOUND") as MockResponse;
    expect((body as { error: { originalMessage?: string } }).error.originalMessage).toBe("Resource not found");
  });
});
