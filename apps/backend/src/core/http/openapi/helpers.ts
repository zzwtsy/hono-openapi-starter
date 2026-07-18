import type { z } from "@hono/zod-openapi";

import type { ErrorCode } from "../../errors/error-registry.js";
import { errorRegistry } from "../../errors/error-registry.js";
import { createSuccessEnvelopeSchema, ErrorEnvelopeSchema } from "./components.js";

export function jsonSuccessResponse<TSchema extends z.ZodType>(
  schema: TSchema,
  description: string,
) {
  return {
    description,
    content: {
      "application/json": {
        schema: createSuccessEnvelopeSchema(schema),
      },
    },
  };
}

/**
 * 按 code 生成 envelope example（response 级，覆盖 schema 字段 example）。
 * - message/originalMessage 用 errorRegistry[code].defaultMessage(en)，不用 route description
 *   （description 已在 response.description 字段，不重复）。运行时 message 由 i18n 按 locale + params 派生
 *   （见 error-code-system.md），example 展示 en 默认样貌。
 * - type 映射对齐运行时 mapError：VALIDATION_FAILED->validation+details，INTERNAL_ERROR->internal，其他->business。
 */
function errorExample(code: ErrorCode): Record<string, unknown> {
  const type = code === "COMMON_VALIDATION_FAILED"
    ? "validation"
    : code === "COMMON_INTERNAL_ERROR" ? "internal" : "business";
  return {
    success: false,
    code,
    message: errorRegistry[code].defaultMessage,
    data: null,
    error: {
      type,
      originalMessage: errorRegistry[code].defaultMessage,
      ...(type === "validation" ? { details: [{ path: ["body", "email"], message: "邮箱格式无效" }] } : {}),
    },
    meta: { requestId: "018f9d0f-fc0b-7f77-b2b7-78ec3efdb7ae" },
  };
}

/**
 * 错误响应：统一 ErrorEnvelope schema + response 级 example（按 code 区分）。
 * - description 作为 OpenAPI response 的描述（场景）；example 展示该 error 码的默认样貌（message=defaultMessage）。
 * - code 强制传入，让每个错误响应显式绑定错误码；response 级 example 优先于 schema 字段 example，
 *   OpenAPI 文档（Scalar）各状态码展示真实示例。
 */
export function jsonErrorResponse(description: string, code: ErrorCode) {
  return {
    description,
    content: {
      "application/json": {
        schema: ErrorEnvelopeSchema,
        example: errorExample(code),
      },
    },
  };
}
