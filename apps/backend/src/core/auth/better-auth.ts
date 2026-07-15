import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins/bearer";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/client.js";
import * as authSchema from "../../db/schema/auth-schema.js";
import { systemSettings } from "../../db/schema/index.js";
import env from "../../env.js";

/**
 * signUp 注册值 schema:core 层本地定义(守 architecture/backend.md 边界,不 import features)。
 * 与 features/system-settings/schemas.ts 的 signUpValueSchema 同构,改值结构时两处同步。
 */
const signUpValueSchema = z.object({ enabled: z.boolean() });

/**
 * Better Auth 实例。
 *
 * - drizzle adapter(postgres-js,显式传 auth 4 表 schema)
 * - bearer 插件:让 getSession 同时接受 `Authorization: Bearer`(默认只读 cookie)
 * - email/password 认证,sign-up 注册开关由 `hooks.before` 读 DB `system_settings.signUp.enabled` 控制(脱离 env,见 ADR-0007)
 * - user.orgId additionalField:权限层用,认证层不读不写
 * - user.disabled additionalField:databaseHooks.session.create.before 检查,禁用时阻止 session 创建
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
      orgId: { type: "string", required: false },
      /** 账号禁用标记：databaseHooks.session.create.before 检查，禁用时阻止 session 创建（自建，不用 BA admin 插件，见 ADR-0007）。 */
      disabled: { type: "boolean", required: false },
    },
  },
  hooks: {
    // hooks.before 对所有 /api/auth/* 端点触发(BA 用户级 hook 无路径 matcher)。ctx 类型(MiddlewareInputContext)
    // 不暴露 path(运行时由 dispatch 注入),但暴露 request,故用 request.url 判断端点。
    // sign-up 注册开关:直接查 DB system_settings.signUp.enabled(不经 SystemSettingService:core 禁止 import
    // features,见 architecture/backend.md 边界),未配置或非 true 一律拒绝(缺失即禁,安全默认)。
    before: async (ctx) => {
      // 用 pathname 判断端点(去 query/fragment),防带参 URL 绕过 endsWith 整个 url 的漏洞
      // (如 /sign-up/email?foo=bar 的 url.endsWith("/sign-up/email") 为 false 会放行)。
      const url = ctx.request?.url;
      if (url == null || !new URL(url).pathname.endsWith("/sign-up/email")) {
        return;
      }
      const [row] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "signUp"));
      // safeParse 窄化 jsonb value(unknown)并校验;parse 失败按未配置处理(拒绝注册,安全默认)。
      if (signUpValueSchema.safeParse(row?.value).data?.enabled !== true) {
        throw APIError.from("FORBIDDEN", {
          message: "注册已关闭",
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
