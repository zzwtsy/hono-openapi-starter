export const REDACTED = "[REDACTED]";

const SENSITIVE_FIELD_NAMES = [
  "authorization",
  "Authorization",
  "cookie",
  "Cookie",
  "set-cookie",
  "Set-Cookie",
  "setCookie",
  "password",
  "Password",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "sessionToken",
  "session_token",
  "csrfToken",
  "csrf_token",
  "idToken",
  "id_token",
  "tokenHash",
  "token_hash",
  "tokenId",
  "token_id",
  "tokenValue",
  "token_value",
  "secret",
  "clientSecret",
  "client_secret",
  "apiKey",
  "api_key",
  "apikey",
  "api-key",
  "xApiKey",
  "x-api-key",
  "X-Api-Key",
  "X-API-Key",
  "verificationCode",
  "verification_code",
] as const;

const REDACTION_PATH_PREFIXES = [
  "",
  "*",
  "*.*",
  "*.*.*",
  "*[*]",
  "*.*[*]",
  "err",
  "err.*",
  "err.*.*",
  "err.*[*]",
  "cause",
  "cause.*",
  "cause.*.*",
] as const;

const EMAIL_PATTERN = /[\w.%+-]+@[\w.-]+\.[A-Z]{2,}/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[\w.~+/-]+=*/gi;
const SENSITIVE_ASSIGNMENT_PATTERN = /\b(x[-_]?api[-_]?key|api[-_]?key|password|token|secret)(\s*[:=]\s*)[^\s,;&]+/gi;

export const logRedactionPaths = createLogRedactionPaths();

export function sanitizeErrorText(value: string) {
  return value
    .replaceAll(EMAIL_PATTERN, REDACTED)
    .replaceAll(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED}`)
    .replaceAll(SENSITIVE_ASSIGNMENT_PATTERN, (_match, key: string, separator: string) => {
      return `${key}${separator}${REDACTED}`;
    });
}

export function sanitizeSerializedError<TValue>(value: TValue): TValue {
  return sanitizeErrorValue(value, new WeakSet<object>()) as TValue;
}

function sanitizeErrorValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => sanitizeErrorValue(item, seen));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if ((key === "message" || key === "stack") && typeof nestedValue === "string") {
      sanitized[key] = sanitizeErrorText(nestedValue);
      continue;
    }

    sanitized[key] = key === "cause"
      ? sanitizeErrorValue(nestedValue, seen)
      : nestedValue;
  }

  return sanitized;
}

function createLogRedactionPaths() {
  const paths = new Set<string>();

  for (const fieldName of SENSITIVE_FIELD_NAMES) {
    const fieldPath = toPathSegment(fieldName);

    for (const prefix of REDACTION_PATH_PREFIXES) {
      paths.add(appendPath(prefix, fieldPath));
    }
  }

  return Array.from(paths);
}

function appendPath(prefix: string, fieldPath: string) {
  if (prefix === "") {
    return fieldPath;
  }

  return fieldPath.startsWith("[") ? `${prefix}${fieldPath}` : `${prefix}.${fieldPath}`;
}

function toPathSegment(fieldName: string) {
  if (/^[a-z_$][\w$]*$/i.test(fieldName)) {
    return fieldName;
  }

  return `[${JSON.stringify(fieldName)}]`;
}
