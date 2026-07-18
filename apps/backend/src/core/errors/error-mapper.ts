import type { ErrorType } from "../http/response.js";

import type { ErrorCode } from "./error-registry.js";
import type { ValidationErrorDetail } from "./zod-error.js";
import { z } from "zod";
import { AppError } from "./app-error.js";
import { formatZodError } from "./zod-error.js";

export interface MappedError {
  code: ErrorCode;
  details?: ValidationErrorDetail[];
  params?: Readonly<Record<string, string | number>>;
  type: ErrorType;
}

export function mapError(error: unknown): MappedError {
  // 错误映射只产出领域无关的响应语义，实际 JSON shape 交给 response helper。
  if (error instanceof AppError) {
    return {
      code: error.code,
      details: error.details,
      params: error.params,
      type: "business",
    };
  }

  if (error instanceof z.ZodError) {
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
