import { isAPIError } from "better-auth/api";

/**
 * 认证事件审计解析(纯函数,便于单测)。
 *
 * 从 better-auth hooks 的 ctx 提取审计所需信息,把 BA 行为耦合收敛到此处:
 * - sign-in:hooks.after 在 APIError 时也执行,`ctx.context.returned` 是错误对象时记 failure
 * - sign-out:hooks.before 里 session 删除前取用户,取不到(未登录)不记
 *
 * `ctx.context.newSession` 是 BA 类型化公开字段(types/context.d.ts),非内部 API。
 */

/** 审计需要的用户最小信息(orgId 用于管理子树可见性过滤;name 是写时名称快照)。 */
export interface AuthAuditUser {
  id: string;
  orgId: string | null;
  name: string | null;
}

/** sign-in 审计事件解析结果:成功/失败都记。 */
export interface SignInAuditEvent {
  user: AuthAuditUser | null;
  status: "success" | "failure";
  errorCode?: string;
}

/** sign-in after hook ctx 的结构化子集(避免依赖 BA 完整类型,结构兼容即可)。 */
interface SignInHookCtx {
  context: {
    returned?: unknown;
    newSession?: { user?: unknown } | null;
  };
}

/** sign-out before hook 里 session 的结构化子集。 */
interface SignOutSession {
  user: unknown;
}

/** 从 sign-in after hook 的 ctx 解析审计事件。 */
export function resolveSignInEvent(ctx: SignInHookCtx): SignInAuditEvent {
  const returned = ctx.context.returned;
  const failed = isAPIError(returned);
  const user = failed ? null : toAuthAuditUser(ctx.context.newSession?.user);
  return {
    user,
    status: failed ? "failure" : "success",
    errorCode: failed ? (returned as { body?: { code?: string } }).body?.code : undefined,
  };
}

/** 从 sign-out before hook 的 session 提取审计用户;session 为 null(未登录)返回 null 不记。 */
export function signOutAuditUser(session: SignOutSession | null): AuthAuditUser | null {
  return toAuthAuditUser(session?.user);
}

function toAuthAuditUser(user: unknown): AuthAuditUser | null {
  if (user == null || typeof user !== "object") {
    return null;
  }
  const { id, orgId, name } = user as { id?: unknown; orgId?: unknown; name?: unknown };
  if (typeof id !== "string") {
    return null;
  }
  return {
    id,
    orgId: typeof orgId === "string" ? orgId : null,
    name: typeof name === "string" ? name : null,
  };
}
