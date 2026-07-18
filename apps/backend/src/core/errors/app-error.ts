import type { ErrorCode } from "./error-registry.js";
import type { ValidationErrorDetail } from "./zod-error.js";

import { errorRegistry } from "./error-registry.js";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly details?: ValidationErrorDetail[];
  readonly expose: boolean;
  readonly status: number;

  constructor(code: ErrorCode, options: {
    cause?: unknown;
    details?: ValidationErrorDetail[];
    params?: Record<string, string | number>;
  } = {}) {
    const meta = errorRegistry[code];

    super(meta.defaultMessage, { cause: options.cause });

    this.name = "AppError";
    this.code = code;
    this.params = options.params;
    this.status = meta.status;
    this.expose = meta.expose;
    this.details = options.details;
  }
}
