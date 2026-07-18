import type { MiddlewareHandler } from "hono";

import type { AppBindings } from "../http/context.js";

import { DEFAULT_LOCALE, detectLocale } from "./locale.js";

/**
 * 解析 Accept-Language 注入 `c.var.locale`（默认 en）。
 *
 * 挂在 requestId 之后（errorResponse 取 locale 需已注入）。
 * 对齐 Better Auth i18n 的 Accept-Language 检测（支持 q 值）。
 */
export function i18nMiddleware(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    c.set("locale", detectLocale(c.req.header("accept-language")) ?? DEFAULT_LOCALE);
    await next();
  };
}
