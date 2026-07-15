export const errorRegistry = {
  COMMON_OK: {
    status: 200,
    defaultMessage: "OK",
    expose: true,
  },
  COMMON_VALIDATION_FAILED: {
    status: 422,
    defaultMessage: "Validation failed",
    expose: true,
  },
  COMMON_UNAUTHORIZED: {
    status: 401,
    defaultMessage: "Unauthorized",
    expose: true,
  },
  COMMON_FORBIDDEN: {
    status: 403,
    defaultMessage: "Forbidden",
    expose: true,
  },
  AUTH_ACCOUNT_DISABLED: {
    status: 403,
    defaultMessage: "Account is disabled",
    expose: true,
  },
  AUTH_SIGNUP_DISABLED: {
    status: 403,
    defaultMessage: "Sign-up is disabled",
    expose: true,
  },
  COMMON_NOT_FOUND: {
    status: 404,
    defaultMessage: "Resource not found",
    expose: true,
  },
  COMMON_CONFLICT: {
    status: 409,
    defaultMessage: "Conflict",
    expose: true,
  },
  COMMON_RATE_LIMITED: {
    status: 429,
    defaultMessage: "Too many requests",
    expose: true,
  },
  COMMON_SERVICE_UNAVAILABLE: {
    status: 503,
    defaultMessage: "Service unavailable",
    expose: true,
  },
  COMMON_INTERNAL_ERROR: {
    status: 500,
    defaultMessage: "Internal server error",
    expose: false,
  },
} as const;

export type ErrorCode = keyof typeof errorRegistry;
