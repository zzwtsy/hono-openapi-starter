import { REDACTED, SENSITIVE_FIELD_NAMES } from "../logger/redact.js";

/**
 * 审计 before/after 递归脱敏。
 *
 * 复用 `logger/redact.ts` 的 `SENSITIVE_FIELD_NAMES` 作为敏感字段名单(单一来源),
 * 递归遍历对象/数组,把敏感字段的值替换为 `[REDACTED]`。
 *
 * 与 loglayer 的 redactionPlugin 不同:plugin 按 path 通配匹配日志字段;
 * 审计需要递归处理任意 JSON 深度的 before/after 对象,故单独实现。
 */

const sensitiveSet = new Set(SENSITIVE_FIELD_NAMES.map(n => n.toLowerCase()));

/** 递归脱敏对象里的敏感字段(不修改原对象,返回新对象)。 */
export function sanitize(value: unknown): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(value)) {
    if (sensitiveSet.has(key.toLowerCase())) {
      result[key] = REDACTED;
    } else if (typeof val === "object" && val !== null) {
      result[key] = sanitize(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}
