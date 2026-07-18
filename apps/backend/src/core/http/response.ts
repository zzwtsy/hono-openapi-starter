import type { z } from "@hono/zod-openapi";
import type { Context } from "hono";

import type { ErrorCode } from "../errors/error-registry.js";
import type { AppBindings } from "./context.js";
import type { createSuccessEnvelopeSchema, ErrorEnvelopeSchema } from "./openapi/components.js";
import { errorRegistry } from "../errors/error-registry.js";

// envelope 类型从 zod schema 派生：zod 是唯一真相来源，运行时与 OpenAPI 契约不会漂移。
type SuccessEnvelope<TData> = z.infer<ReturnType<typeof createSuccessEnvelopeSchema<z.ZodType<TData>>>>;
type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type ErrorType = ErrorEnvelope["error"]["type"];

export function successResponse<TData>(
  c: Context<AppBindings>,
  data: TData,
  options: {
    message?: string;
  } = {},
) {
  // 成功响应在这里统一 envelope 结构，feature handler 只需要提供业务 data。
  const body: SuccessEnvelope<TData> = {
    success: true,
    code: "COMMON_OK",
    message: options.message ?? errorRegistry.COMMON_OK.defaultMessage,
    data,
    error: null,
    meta: {
      requestId: c.get("requestId"),
    },
  };

  return c.json(body, 200);
}

export function errorResponse(
  c: Context<AppBindings>,
  code: ErrorCode,
  options: {
    details?: unknown;
    message?: string;
    type?: ErrorType;
  } = {},
) {
  const meta = errorRegistry[code];
  // 未暴露的错误不透传调用方 message 与 details，避免内部异常细节进入公开响应。
  const message = meta.expose
    ? options.message ?? meta.defaultMessage
    : meta.defaultMessage;
  // details 同样按 expose 过滤：COMMON_INTERNAL_ERROR 等未暴露码的 AppError 可能携带内部结构，
  // 必须与 message 同档位拦截，否则 mapError 透传的 error.details 会直接进入响应体。
  const details = meta.expose ? options.details : undefined;
  const body: ErrorEnvelope = {
    success: false,
    code,
    message,
    data: null,
    error: {
      type: options.type ?? "business",
      ...(details === undefined ? {} : { details }),
    },
    meta: {
      requestId: c.get("requestId"),
    },
  };

  return c.json(body, meta.status);
}
