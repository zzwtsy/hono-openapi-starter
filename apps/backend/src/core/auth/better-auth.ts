import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins/bearer";

import { db } from "../../db/client.js";
import * as authSchema from "../../db/schema/auth-schema.js";
import env from "../../env.js";

/**
 * Better Auth 实例。
 *
 * - drizzle adapter(postgres-js,显式传 auth 4 表 schema)
 * - bearer 插件:让 getSession 同时接受 `Authorization: Bearer`(默认只读 cookie)
 * - email/password 认证;**不提供自助注册**(hooks.before 永久拒绝 /sign-up/email,见 ADR-0007 superseded 注记)
 * - user.orgId additionalField:权限层用,认证层不读不写;`input: false` 防客户端写入
 * - user.disabled additionalField:databaseHooks.session.create.before 检查,禁用时阻止 session 创建;`input: false` 防客户端写入
 *
 * `/api/auth/*` 原生端点不包业务 envelope(见 ADR-0003)。
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? [],
  plugins: [bearer()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      // input: false 防客户端经 /api/auth/sign-up、/api/auth/update-user 写入 orgId/disabled
      // (BA 文档:input 默认 true,不设是安全漏洞)。自建 createUser 走业务端点,不受此限。
      orgId: { type: "string", required: false, input: false },
      /** 账号禁用标记：databaseHooks.session.create.before 检查，禁用时阻止 session 创建（自建，不用 BA admin 插件，见 ADR-0007）。 */
      disabled: { type: "boolean", required: false, input: false },
    },
  },
  hooks: {
    // 模板不提供自助注册:hooks.before 对所有 /api/auth/* 触发(BA 用户级 hook 无路径 matcher),
    // 命中 /sign-up/email 一律拒绝(不依赖 DB 开关)。ctx 不暴露 path(运行时由 dispatch 注入),
    // 用 request.url 的 pathname 判断端点(见 ADR-0007 superseded 注记:原运行时 signUp 开关已取消)。
    before: async (ctx) => {
      // pathname 判断(去 query/fragment),防带参 URL 绕过 endsWith 整个 url
      // (如 /sign-up/email?foo=bar 的 url.endsWith("/sign-up/email") 为 false 会放行)。
      const url = ctx.request?.url;
      if (url != null && new URL(url).pathname.endsWith("/sign-up/email")) {
        throw APIError.from("FORBIDDEN", {
          message: "不支持自助注册",
          code: "AUTH_SIGNUP_DISABLED",
        });
      }
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session, ctx) => {
          if (!ctx) {
            return;
          }
          const found = await ctx.context.internalAdapter.findUserById(session.userId);
          // additionalFields(disabled)不在 BA 基础 User 类型里,需断言访问(与 admin 插件访问 banned 同理)。
          if ((found as { disabled?: boolean } | null)?.disabled === true) {
            throw APIError.from("FORBIDDEN", {
              message: "Account is disabled",
              code: "AUTH_ACCOUNT_DISABLED",
            });
          }
        },
      },
    },
  },
});

/** Better Auth session 推断类型(含 additionalFields/plugins 扩展)。 */
export type AuthSession = typeof auth.$Infer.Session;
