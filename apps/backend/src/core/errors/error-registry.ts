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

  // --- 业务错误码（DOMAIN_REASON）：恢复业务语义，客户端可按 code 精确处理 ---
  // USER
  USER_NOT_FOUND: { status: 404, defaultMessage: "User not found", expose: true },
  USER_EMAIL_ALREADY_EXISTS: { status: 409, defaultMessage: "Email already exists", expose: true },
  USER_NO_CREDENTIAL_ACCOUNT: { status: 404, defaultMessage: "User has no credential account", expose: true },
  USER_CANNOT_DISABLE_SELF: { status: 403, defaultMessage: "Cannot disable yourself", expose: true },
  USER_CANNOT_REVOKE_OWN_AUTH: { status: 403, defaultMessage: "Cannot revoke your own authorization", expose: true },
  USER_CANNOT_MODIFY_OWN_AUTH: { status: 403, defaultMessage: "Cannot modify your own authorization", expose: true },
  USER_CANNOT_TRANSFER_SELF: { status: 403, defaultMessage: "Cannot transfer yourself to another organization", expose: true },
  USER_TRANSFER_CONFLICT: { status: 409, defaultMessage: "User organization was changed concurrently", expose: true },
  USER_INVALID_PASSWORD: { status: 401, defaultMessage: "Current password is incorrect", expose: true },
  // ROLE
  ROLE_NOT_FOUND: { status: 404, defaultMessage: "Role not found", expose: true },
  ROLE_NAME_CONFLICT: { status: 409, defaultMessage: "Role name already exists", expose: true },
  ROLE_REQUIRES_SYSTEM_ROOT: { status: 403, defaultMessage: "Global role management requires a system root administrator", expose: true },
  // PERMISSION
  PERMISSION_CODE_INVALID: { status: 400, defaultMessage: "Invalid permission code", expose: true },
  PERMISSION_NOT_FOUND: { status: 404, defaultMessage: "Permission not found: {permissionCode}", expose: true },
  // ORG
  ORG_NOT_FOUND: { status: 404, defaultMessage: "Organization not found", expose: true },
  ORG_CYCLE: { status: 409, defaultMessage: "Organization cycle detected", expose: true },
  ORG_HAS_CHILDREN: { status: 409, defaultMessage: "Organization has children", expose: true },
  ORG_HAS_USERS: { status: 409, defaultMessage: "Organization still has users", expose: true },
  ORG_SAME_AS_CURRENT: { status: 409, defaultMessage: "Target organization is the same as current", expose: true },
  ORG_ROOT_IMMUTABLE: { status: 409, defaultMessage: "System root organization topology is immutable", expose: true },
  ASSIGNMENT_EXCEEDS_ACTOR_PERMISSION: { status: 403, defaultMessage: "Cannot delegate a permission beyond the actor's authority", expose: true },
  // PROJECT
  PROJECT_NOT_FOUND: { status: 404, defaultMessage: "Project not found", expose: true },
  PROJECT_NAME_CONFLICT: { status: 409, defaultMessage: "Project name already exists", expose: true },
  // SETTING
  SETTING_KEY_UNKNOWN: { status: 422, defaultMessage: "Unknown setting key", expose: true },
} as const;

export type ErrorCode = keyof typeof errorRegistry;
