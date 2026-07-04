import type { z } from "zod";
import type { ErrorType } from "../http/response.js";

import type { ErrorCode } from "./error-registry.js";
import { AppError } from "./app-error.js";
import { formatZodError } from "./zod-error.js";

export interface MappedError {
  code: ErrorCode;
  details?: unknown;
  message?: string;
  type: ErrorType;
}

export function mapError(error: unknown): MappedError {
  // 错误映射只产出领域无关的响应语义，实际 JSON shape 交给 response helper。
  if (error instanceof AppError) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
      type: "business",
    };
  }

  if (isZodError(error)) {
    return {
      code: "COMMON_VALIDATION_FAILED",
      details: formatZodError(error),
      type: "validation",
    };
  }

  return {
    code: "COMMON_INTERNAL_ERROR",
    type: "internal",
  };
}

function isZodError(error: unknown): error is z.ZodError {
  return typeof error === "object"
    && error !== null
    && "issues" in error
    && Array.isArray(error.issues);
}
