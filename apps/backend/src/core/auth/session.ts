import { auth } from "./better-auth.js";

/**
 * 获取当前请求的 Better Auth session。
 *
 * 同时支持 cookie 与 `Authorization: Bearer`(后者需 bearer 插件)。
 * 未登录返回 `null`,不抛异常。
 */
export async function getSession(headers: Headers) {
  return auth.api.getSession({ headers });
}
