import type { ErrorCode } from "../errors/error-registry.js";
import type { Locale } from "./locale.js";

import { errorRegistry } from "../errors/error-registry.js";
import { messages } from "./messages.js";

/**
 * 按 code + locale 生成 message，模板 `{key}` 填充 params。
 *
 * - message：locale 字典查得的模板填 params；locale 无该码时 fallback en。
 * - originalMessage：en 模板填 params（完整 en 消息，供排障/日志/客户端 fallback）。
 *
 * 简单模板起步（`{id}`）；复数/性别需求出现再升级 ICU MessageFormat。
 */
export function translate(
  code: ErrorCode,
  locale: Locale,
  params?: Readonly<Record<string, string | number>>,
): { message: string; originalMessage: string } {
  const enTemplate = messages.en[code] ?? errorRegistry[code].defaultMessage;
  const template = messages[locale][code] ?? enTemplate;
  return {
    message: fillTemplate(template, params),
    originalMessage: fillTemplate(enTemplate, params),
  };
}

/** `{key}` 占位符填充；未提供的占位符保留原样（便于发现遗漏）。 */
function fillTemplate(template: string, params?: Readonly<Record<string, string | number>>): string {
  if (params == null) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}
