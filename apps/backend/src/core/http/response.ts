import type { Context } from "hono";

import type { ErrorCode } from "../errors/error-registry.js";

import type { AppBindings } from "./context.js";
import { errorRegistry } from "../errors/error-registry.js";

export interface ResponseMeta {
  requestId: string;
}

export interface ErrorDetails {
  type: "business" | "internal" | "validation";
  details?: unknown;
}

export interface SuccessEnvelope<TData> {
  success: true;
  code: "COMMON_OK";
  message: string;
  data: TData;
  error: null;
  meta: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  code: ErrorCode;
  message: string;
  data: null;
  error: ErrorDetails;
  meta: ResponseMeta;
}

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
    type?: ErrorDetails["type"];
  } = {},
) {
  const meta = errorRegistry[code];
  // 未暴露的错误不透传调用方 message，避免内部异常细节进入公开响应。
  const message = meta.expose
    ? options.message ?? meta.defaultMessage
    : meta.defaultMessage;
  const body: ErrorEnvelope = {
    success: false,
    code,
    message,
    data: null,
    error: {
      type: options.type ?? "business",
      ...(options.details === undefined ? {} : { details: options.details }),
    },
    meta: {
      requestId: c.get("requestId"),
    },
  };

  return c.json(body, meta.status);
}
