import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 审计上下文:请求级 actor + 请求元信息,由 ALS 注入,writeAudit 自动取用。
 *
 * - `auditContextMiddleware` 初始化 store(ip/ua/requestId)
 * - `requireAuth` 认证成功后调 `setAuditContext` 补充 actorUserId/actorOrgId
 * - store 是可变对象,同请求内可增量填充(不需要 ALS run 嵌套)
 *
 * 参照 `permissionCacheMiddleware` 的 ALS 模式。
 */
export interface AuditContext {
  actorUserId: string | null;
  actorOrgId: string | null;
  /** 操作者名称快照(session.user.name,改名不污染历史;认证事件手动传)。 */
  actorNameSnapshot: string | null;
  ipAddress: string | undefined;
  userAgent: string | undefined;
  requestId: string | undefined;
}

const auditStorage = new AsyncLocalStorage<AuditContext>();

/** 取当前请求的审计上下文(无 ALS 上下文返回 undefined)。 */
export function getAuditContext(): AuditContext | undefined {
  return auditStorage.getStore();
}

/** 增量更新当前请求的审计上下文(在已有 store 上 Object.assign)。无 store 时 no-op。 */
export function setAuditContext(partial: Partial<AuditContext>): void {
  const store = auditStorage.getStore();
  if (store != null) {
    Object.assign(store, partial);
  }
}

/** 在审计 ALS 上下文内执行 callback(供 auditContextMiddleware 用)。 */
export async function runWithAuditContext<T>(context: AuditContext, callback: () => Promise<T>): Promise<T> {
  return auditStorage.run(context, callback);
}
