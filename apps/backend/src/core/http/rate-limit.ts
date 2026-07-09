import type { Context } from "hono";
import type { AppBindings } from "./context.js";

import { rateLimiter } from "hono-rate-limiter";
import { errorResponse } from "./response.js";

/**
 * 客户端标识(限流 key):反代后取 x-forwarded-for 首个 IP;无则 anonymous。
 * 生产部署在反代后,反代需设 x-forwarded-for;直连无 xff 时归为 anonymous(共享额度)。
 */
function clientKey(c: Context<AppBindings>): string {
  const xff = c.req.header("x-forwarded-for");
  return xff == null || xff === "" ? "anonymous" : xff.split(",")[0].trim();
}

/** 认证端点限流(防暴力登录):10 次/分钟/IP。 */
export const authRateLimiter = rateLimiter<AppBindings>({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-6",
  keyGenerator: c => clientKey(c),
  handler: c => errorResponse(c, "COMMON_RATE_LIMITED"),
});

/** 业务 API 限流:100 次/分钟/IP。 */
export const apiRateLimiter = rateLimiter<AppBindings>({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: "draft-6",
  keyGenerator: c => clientKey(c),
  handler: c => errorResponse(c, "COMMON_RATE_LIMITED"),
});
