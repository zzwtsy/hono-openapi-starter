/** 审计资源引用:历史展示优先使用写入时提供的名称快照。 */
export interface AuditResourceRef {
  type: string;
  id: string;
  name?: string;
}

/** before/after 中需要解析名称的关联字段声明。 */
export interface AuditRelationSpec {
  field: string;
  resourceType: string;
}

/** 资源名称解析器,由应用装配层注册,core 不依赖业务表。 */
export type AuditNameResolver = (id: string) => string | undefined | Promise<string | undefined>;

/** resolver 失败诊断上下文。 */
export interface AuditResolverErrorContext {
  kind: "resource" | "relation";
  resourceType: string;
  id: string;
  field?: string;
}

/** resolver 失败回调,用于由 writeAudit 记录结构化诊断但继续保留事件。 */
export type AuditResolverErrorHandler = (
  error: unknown,
  context: AuditResolverErrorContext,
) => void;
