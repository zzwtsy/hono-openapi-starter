/** 审计查询操作者。由 HTTP handler 从认证上下文提取，策略本身不依赖 Hono。 */
export interface AuditVisibilityActor {
  userId: string;
  organizationId: string;
}

/** 单个业务资源的可见性策略；不可见时抛出该业务资源对应的错误。 */
export type AuditResourceVisibilityPolicy = (
  actor: AuditVisibilityActor,
  resourceId: string,
) => void | Promise<void>;

/** 全局审计列表的组织范围解析器。 */
export type AuditActorOrgScopeResolver = (
  actor: AuditVisibilityActor,
) => readonly string[] | Promise<readonly string[]>;

const resourcePolicies = new Map<string, AuditResourceVisibilityPolicy>();
let actorOrgScopeResolver: AuditActorOrgScopeResolver | undefined;

/** 注册一种资源的审计可见性策略。 */
export function registerAuditResourceVisibilityPolicy(
  resourceType: string,
  policy: AuditResourceVisibilityPolicy,
): void {
  const existing = resourcePolicies.get(resourceType);
  if (existing != null && existing !== policy) {
    throw new Error(`duplicate audit resource visibility policy: ${resourceType}`);
  }
  resourcePolicies.set(resourceType, policy);
}

/** 获取已注册的资源可见性策略；未知类型返回 undefined。 */
export function getAuditResourceVisibilityPolicy(
  resourceType: string,
): AuditResourceVisibilityPolicy | undefined {
  return resourcePolicies.get(resourceType);
}

/** 注册全局审计列表使用的操作者组织范围解析器。 */
export function registerAuditActorOrgScopeResolver(resolver: AuditActorOrgScopeResolver): void {
  if (actorOrgScopeResolver != null && actorOrgScopeResolver !== resolver) {
    throw new Error("duplicate audit actor organization scope resolver");
  }
  actorOrgScopeResolver = resolver;
}

/** 解析操作者可以查询的组织范围；未完成应用装配时显式失败。 */
export async function resolveAuditActorOrgScope(actor: AuditVisibilityActor): Promise<string[]> {
  if (actorOrgScopeResolver == null) {
    throw new Error("audit actor organization scope resolver is not registered");
  }
  return [...await actorOrgScopeResolver(actor)];
}

/** 测试辅助：隔离模块级 policy registry。 */
export function __resetAuditVisibilityPoliciesForTest(): void {
  resourcePolicies.clear();
  actorOrgScopeResolver = undefined;
}
