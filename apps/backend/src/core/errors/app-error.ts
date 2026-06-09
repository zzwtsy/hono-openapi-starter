import type { ErrorCode } from "./error-registry.js";

import { errorRegistry } from "./error-registry.js";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly expose: boolean;
  readonly status: number;

  constructor(code: ErrorCode, options: {
    cause?: unknown;
    details?: unknown;
    message?: string;
  } = {}) {
    const meta = errorRegistry[code];

    super(options.message ?? meta.defaultMessage, { cause: options.cause });

    this.name = "AppError";
    this.code = code;
    this.status = meta.status;
    this.expose = meta.expose;
    this.details = options.details;
  }
}
