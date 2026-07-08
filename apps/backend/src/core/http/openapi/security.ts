/**
 * OpenAPI 安全方案声明。
 *
 * better-auth session 同时支持 cookie(前端常用,cookie 名 `better-auth.session_token`)
 * 与 `Authorization: Bearer`(bearer 插件)。两个 scheme 都注册,认证路由通过 `authedSecurity`
 * 声明"任一即可",生成的 spec 如实反映端点需认证。
 *
 * 在 `configureOpenApi`(core/app/openapi.ts)注册到 `openAPIRegistry`。
 */

/** 认证路由用的 security 声明:Cookie 或 Bearer 任一即可。 */
export const authedSecurity: Array<Record<string, string[]>> = [
  { CookieAuth: [] },
  { BearerAuth: [] },
];

/** securitySchemes 组件定义,供 `app.openAPIRegistry.registerComponent` 注册。 */
export const securitySchemes = {
  CookieAuth: {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
    description: "Better Auth session cookie(前端浏览器会话)",
  },
  BearerAuth: {
    type: "http",
    scheme: "bearer",
    description: "Better Auth bearer token(Authorization: Bearer <token>)",
  },
} as const;
