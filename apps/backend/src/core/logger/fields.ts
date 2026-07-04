import type { MappedError } from "../errors/error-mapper.js";
import type { ErrorCode } from "../errors/error-registry.js";
import type { ErrorType } from "../http/response.js";

import { serializeError } from "serialize-error";

import { mapError } from "../errors/error-mapper.js";

import { sanitizeErrorText, sanitizeSerializedError } from "./redact.js";

export interface HttpRequestLogFields {
  method: string;
  remoteAddress?: string;
  url: string;
}

export interface HttpResponseLogFields {
  statusCode: number;
}

export interface ErrorLogInput {
  req: HttpRequestLogFields;
  requestId: string;
  res: HttpResponseLogFields;
  responseTime?: number;
}

export interface ErrorLogFields extends ErrorLogInput {
  cause?: unknown;
  code: ErrorCode;
  stack?: string;
  status: number;
  type: ErrorType;
}

export function createErrorLogFields(
  error: unknown,
  input: ErrorLogInput,
  mappedError: MappedError = mapError(error),
): ErrorLogFields {
  const stack = error instanceof Error && error.stack !== undefined
    ? sanitizeErrorText(error.stack)
    : undefined;
  const cause = error instanceof Error ? sanitizeErrorCause(error.cause) : undefined;

  return {
    requestId: input.requestId,
    req: input.req,
    res: input.res,
    ...(input.responseTime === undefined ? {} : { responseTime: input.responseTime }),
    code: mappedError.code,
    status: input.res.statusCode,
    type: mappedError.type,
    ...(stack === undefined ? {} : { stack }),
    ...(cause === undefined ? {} : { cause }),
  };
}

export function getRemoteAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded !== null && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

function sanitizeErrorCause(cause: unknown) {
  if (cause instanceof Error) {
    return sanitizeSerializedError(serializeError(cause));
  }

  return cause;
}
