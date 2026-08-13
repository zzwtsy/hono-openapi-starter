import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import env from "./src/config/env.js";
import * as authSchema from "./src/db/schema/auth-schema.js";

// Better Auth CLI 的 jiti loader 不解析应用 `@/*` 路径别名，因此不能导入
// src/db/client.ts。postgres-js 是惰性连接；schema generate 不会实际访问数据库。
const cliClient = postgres(env.DATABASE_URL, { max: 1 });
const cliDb = drizzle({ client: cliClient, schema: authSchema });

/**
 * Better Auth CLI 专用配置。
 *
 * 生成器需要先完整加载配置再读取 schema。运行时配置会加载审计模块，
 * 审计模块包含仅由应用运行时解析的路径别名，因此不能从这里复用运行时
 * `src/core/auth/better-auth.ts`。
 *
 * 这里必须只维护影响 Better Auth schema 的配置；认证 hook、插件和审计
 * 行为仍由运行时配置唯一维护。
 */
export const auth = betterAuth({
  database: drizzleAdapter(cliDb, {
    provider: "pg",
    schema: authSchema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      orgId: { type: "string", required: false, input: false },
      disabled: { type: "boolean", required: false, input: false },
    },
  },
});
