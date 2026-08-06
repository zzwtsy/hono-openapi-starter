import { REDACTED, SENSITIVE_FIELD_NAMES } from "../logger/redact.js";

/**
 * 审计 before/after 递归脱敏 + JSON-safe 规范化。
 *
 * 复用 `logger/redact.ts` 的 `SENSITIVE_FIELD_NAMES` 作为通用敏感字段名单,
 * 不承载具体业务的 PII/字段策略。业务特定字段应在 audit() 的 snapshot transform 中投影。
 */

const sensitiveSet = new Set(SENSITIVE_FIELD_NAMES.map(n => n.toLowerCase()));
const CIRCULAR_REFERENCE = "[Circular]";

/** 递归处理对象里的通用敏感字段,不修改原对象。 */
export function sanitize(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet<object>());
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "object") {
    return typeof value === "function" || typeof value === "symbol" ? undefined : value;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (seen.has(value)) {
    return CIRCULAR_REFERENCE;
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item, seen));
    }

    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = sensitiveSet.has(key.toLowerCase())
        ? REDACTED
        : sanitizeValue(nestedValue, seen);
    }
    return result;
  } finally {
    // 只把当前递归路径视为循环;同一对象被多个字段引用时仍各自生成快照。
    seen.delete(value);
  }
}
