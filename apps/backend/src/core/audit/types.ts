import type { Context } from "hono";
import type { AppBindings } from "../http/context.js";

/**
 * audit() 中间件配置:声明式描述一个路由的审计行为。
 *
 * - `resourceType` + `resourceId` 是单资源的快捷写法(内部转成 resourceRefs)
 * - `resourceRefs` 用于多资源操作(如授用户角色:同时涉及 user + role)
 * - `before`/`after` 是可选函数,默认 after 从响应体读
 * - `relations` 声明 before/after 里哪些字段是关联 id,writeAudit 据此查名称存历史快照
 *
 * 设计见 [审计日志计划](../../../docs/plans/audit-log.md)。
 */
export interface AuditConfig {
  /** 业务动作,如 `projects.update`。 */
  action: string;
  /** 前端展示的中文名,如"修改项目"。配置即 catalog,前端不维护映射。 */
  label: string;
  /** 主资源类型(单资源快捷写法)。 */
  resourceType: string;
  /** 主资源 id(单资源快捷写法)。 */
  resourceId: (c: Context<AppBindings>) => string;
  /** 多资源操作时用此函数返回所有资源引用(覆盖 resourceType+resourceId)。 */
  resourceRefs?: (c: Context<AppBindings>) => Array<{ type: string; id: string }>;
  /** before/after 里需解析名称的关联字段名,如 `["orgId"]`。 */
  relations?: string[];
  /** handler 前查旧值。不配则无 before(diff 缺旧值)。 */
  before?: (c: Context<AppBindings>) => Promise<unknown>;
  /** handler 后查新值。不配则默认从响应体 `.data` 读。 */
  after?: (c: Context<AppBindings>) => Promise<unknown>;
  /** 业务自定义上下文(如 `clearAllGrants`)。 */
  metadata?: Record<string, unknown>;
}

/** writeAudit 接收的审计条目(audit() 中间件组装后传入)。 */
export interface AuditEntry {
  action: string;
  resourceRefs: Array<{ type: string; id: string }>;
  beforeState?: unknown;
  afterState?: unknown;
  relations?: string[];
  metadata?: Record<string, unknown>;
  status: "success" | "failure";
  errorCode?: string;
}

/** 审计日志数据库记录(队列中流转,最终 INSERT 到 audit_logs 表)。 */
export interface AuditRecord {
  id: string;
  actorUserId: string | null;
  actorOrgId: string | null;
  actorRoleSnapshot: string | null;
  action: string;
  resourceRefs: Array<{ type: string; id: string; name?: string }>;
  beforeState: unknown;
  afterState: unknown;
  changedFields: string[] | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  status: "success" | "failure";
  errorCode: string | undefined;
  metadata: Record<string, unknown> | undefined;
}
