import { z } from "@hono/zod-openapi";
import { describe, expect, it } from "vitest";
import { AppError } from "./app-error.js";
import { mapError } from "./error-mapper.js";

describe("mapError", () => {
  it("appError 映射为 business", () => {
    const mapped = mapError(new AppError("COMMON_NOT_FOUND"));

    expect(mapped).toMatchObject({ code: "COMMON_NOT_FOUND", type: "business" });
  });

  it("未知错误映射为 internal", () => {
    const mapped = mapError(new Error("boom"));

    expect(mapped).toMatchObject({ code: "COMMON_INTERNAL_ERROR", type: "internal" });
  });

  it("zodError 映射为 validation", () => {
    const result = z.object({ x: z.string() }).safeParse({ x: 1 });
    if (!result.success) {
      const mapped = mapError(result.error);

      expect(mapped).toMatchObject({ code: "COMMON_VALIDATION_FAILED", type: "validation" });
    }
  });

  it("带 issues 数组的非 ZodError 对象不误判为 validation", () => {
    // 收紧 isZodError 后：只有真正的 ZodError 才映射为 validation
    const fakeError = Object.assign(new Error("other lib error"), {
      issues: [{ message: "something" }],
    });

    const mapped = mapError(fakeError);

    expect(mapped).toMatchObject({ code: "COMMON_INTERNAL_ERROR", type: "internal" });
  });
});
