import type { z } from "@hono/zod-openapi";
import type { Context } from "hono";

import type { ErrorCode } from "../errors/error-registry.js";
import type { ValidationErrorDetail } from "../errors/zod-error.js";
import type { AppBindings } from "./context.js";
import type { createSuccessEnvelopeSchema, ErrorEnvelopeSchema } from "./openapi/components.js";
import { errorRegistry } from "../errors/error-registry.js";
import { DEFAULT_LOCALE, translate } from "../i18n/index.js";

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
    details?: ValidationErrorDetail[];
    type?: ErrorType;
    params?: Readonly<Record<string, string | number>>;
  } = {},
) {
  const meta = errorRegistry[code];
  const locale = c.get("locale") ?? DEFAULT_LOCALE;
  // message 完全由 i18n 字典按 code + locale + params 派生（纯 i18n，无 service message 覆盖）。
  // expose:false 也走 i18n（通用 message，非内部细节）；originalMessage 恒为 en（填 params）。
  const { message, originalMessage } = translate(code, locale, options.params);
  // details 按 expose 过滤：COMMON_INTERNAL_ERROR 等未暴露码的 AppError 可能携带内部结构，
  // 必须拦截，否则 mapError 透传的 error.details 会直接进入响应体。
  const details = meta.expose ? options.details : undefined;
  const body: ErrorEnvelope = {
    success: false,
    code,
    message,
    data: null,
    error: {
      type: options.type ?? "business",
      ...(details === undefined ? {} : { details }),
      originalMessage,
    },
    meta: {
      requestId: c.get("requestId"),
    },
  };

  return c.json(body, meta.status);
}
