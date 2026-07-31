import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { bearer } from "better-auth/plugins/bearer";

import { db } from "../../db/client.js";
import * as authSchema from "../../db/schema/auth-schema.js";
import env from "../../env.js";
import { writeAudit } from "../audit/index.js";
import { resolveSignInEvent, signOutAuditUser } from "./auth-audit-events.js";

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
      // 注意:BA parseInputData 对 input:false 字段用 truthy 检查(if (data[key]) throw),
      // falsy 值(disabled:false/orgId:"")静默丢弃(不抛错也不写入)。禁用/启用走自建
      // disable/enable 端点,不依赖 BA input,故无影响。
      orgId: { type: "string", required: false, input: false },
      /** 账号禁用标记：databaseHooks.session.create.before 检查，禁用时阻止 session 创建（自建，不用 BA admin 插件，见 ADR-0007）。 */
      disabled: { type: "boolean", required: false, input: false },
    },
  },
  hooks: {
    // 模板不提供自助注册 + sign-out 审计:hooks.before 对所有 /api/auth/* 触发。
    // 用 createAuthMiddleware 包装获取完整 ctx 类型(GenericEndpointContext)。
    before: createAuthMiddleware(async (ctx) => {
      const url = ctx.request?.url;
      const pathname = url != null ? new URL(url).pathname : "";

      // 禁注册
      if (pathname.endsWith("/sign-up/email")) {
        throw APIError.from("FORBIDDEN", {
          message: "不支持自助注册",
          code: "AUTH_SIGNUP_DISABLED",
        });
      }

      // sign-out 审计:session 删除前记(getSessionFromCtx 拿当前 session);
      // 取不到 session(未登录/已失效)不记,成功失败判定以取到 session 为准(已知局限见计划)。
      if (pathname.endsWith("/sign-out")) {
        const session = await getSessionFromCtx(ctx, { disableRefresh: true });
        const user = signOutAuditUser(session);
        if (user != null) {
          void writeAudit({
            action: "auth.sign-out",
            resourceRefs: [{ type: "user", id: user.id }],
            status: "success",
            actorUserId: user.id,
            actorOrgId: user.orgId,
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const url = ctx.request?.url;
      const pathname = url != null ? new URL(url).pathname : "";

      // sign-in 审计:成功和失败都执行(after hook 在 APIError 时也跑),解析收敛在纯函数
      if (pathname.endsWith("/sign-in/email")) {
        const event = resolveSignInEvent(ctx);
        void writeAudit({
          action: "auth.sign-in",
          resourceRefs: event.user != null ? [{ type: "user", id: event.user.id }] : [],
          status: event.status,
          errorCode: event.errorCode,
          actorUserId: event.user?.id ?? null,
          actorOrgId: event.user?.orgId ?? null,
        });
      }
    }),
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
