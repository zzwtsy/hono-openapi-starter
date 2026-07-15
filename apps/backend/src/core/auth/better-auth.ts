import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";

import { db } from "../../db/client.js";
import * as authSchema from "../../db/schema/auth-schema.js";
import env from "../../env.js";

/**
 * Better Auth 实例。
 *
 * - drizzle adapter(postgres-js,显式传 auth 4 表 schema)
 * - bearer 插件:让 getSession 同时接受 `Authorization: Bearer`(默认只读 cookie)
 * - email/password 认证,sign-up 开关由 `DISABLE_SIGN_UP` 控制
 * - user.orgId additionalField:权限层用,认证层不读不写
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
    disableSignUp: env.DISABLE_SIGN_UP,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      orgId: { type: "string", required: false },
      /** 账号禁用标记：requireAuth 检查，禁用时拒绝并删 session（自建，不用 BA admin 插件，见 ADR-0007）。 */
      disabled: { type: "boolean", required: false },
    },
  },
});

/** Better Auth session 推断类型(含 additionalFields/plugins 扩展)。 */
export type AuthSession = typeof auth.$Infer.Session;
