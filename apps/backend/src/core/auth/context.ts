import type { Context } from "hono";
import type { AppBindings } from "../http/context.js";

import type { AuthSession } from "./better-auth.js";
import { AppError } from "../errors/app-error.js";

/** `requireAuth` 注入 Hono context 的 Better Auth session 变量。 */
export interface AuthVariables {
  user: AuthSession["user"];
  session: AuthSession["session"];
}

/**
 * 从 Hono context 取已认证、已绑定组织的用户,自防御:不依赖 `requirePermission` 中间件顺序。
 *
 * - `user` 缺失抛 `COMMON_UNAUTHORIZED`(401):未认证(与 `requirePermission` 语义一致,`requireAuth` 应已跑)
 * - `user.orgId` 为 null 抛 `COMMON_FORBIDDEN`(403):已认证但无组织,无权限
 *
 * 拒绝让 `undefined`/`null` 流进 service 产生 `WHERE org_id = NULL` 的静默空结果(越权绕过)。
 * 返回类型把 `orgId` 收窄为 `string`,handler 无需 `!` 断言。
 *
 * 通常 `requirePermission` 已先行校验 orgId;本 helper 兜底,即使中间件被去掉/重排也安全。
 */
export function requireOrgUser(c: Context<AppBindings>): { id: string; orgId: string } {
  const user = c.get("user");
  if (user == null) {
    throw new AppError("COMMON_UNAUTHORIZED");
  }
  if (user.orgId == null) {
    throw new AppError("COMMON_FORBIDDEN");
  }
  return { id: user.id, orgId: user.orgId };
}
