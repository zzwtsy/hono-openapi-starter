import type { Context } from "hono";
import type { AppBindings } from "../http/context.js";
import type { AuditActionDefinition } from "./action.js";
import type { AuditRelationSpec, AuditResourceRef } from "./ports.js";

/** 审计资源 id 解析器。 */
export type AuditResourceIdResolver = (c: Context<AppBindings>) => string | Promise<string>;

/** 多资源引用解析器。 */
export type AuditResourceRefsResolver = (c: Context<AppBindings>) =>
  readonly AuditResourceRef[]
  | Promise<readonly AuditResourceRef[]>;

/** before/after 快照解析器。 */
export type AuditSnapshotResolver = (c: Context<AppBindings>) => unknown | Promise<unknown>;

/** 业务特定的快照投影/脱敏器。 */
export type AuditSnapshotTransform = (
  value: unknown,
  c: Context<AppBindings>,
) => unknown | Promise<unknown>;

/** 显式快照配置:先捕获,再执行 feature 提供的投影。 */
export interface AuditSnapshotConfig {
  capture: AuditSnapshotResolver;
  transform?: AuditSnapshotTransform;
}

export type AuditSnapshotInput = AuditSnapshotResolver | AuditSnapshotConfig;

/** after 的捕获模式;阶段 2 起不配置时不再默认读取响应体。 */
export type AuditAfterConfig = "response" | "none" | AuditSnapshotInput;

interface AuditConfigBase<TAction extends AuditActionDefinition> {
  /** 类型安全的业务动作定义(action code + label)。 */
  action: TAction;
  /** before/after 里需解析名称的关联字段。 */
  relations?: readonly AuditRelationSpec[];
  /** handler 前查旧值,可附加 feature-specific transform。 */
  before?: AuditSnapshotInput;
  /** handler 后显式选择 response/none 或自定义快照 provider。 */
  after?: AuditAfterConfig;
  /** 业务自定义上下文(如 `clearAllGrants`)。支持静态对象或按请求动态生成。 */
  metadata?: Record<string, unknown> | ((c: Context<AppBindings>) => Record<string, unknown> | Promise<Record<string, unknown>>);
}

/** 单资源快捷配置。 */
interface SingleResourceAuditConfig {
  /** 主资源类型。 */
  resourceType: string;
  /** 主资源 id。支持 async(create 操作从响应体取 id)。 */
  resourceId: AuditResourceIdResolver;
  /** 单资源模式不可同时配置多资源 resolver。 */
  resourceRefs?: never;
}

/** 多资源配置。 */
interface MultiResourceAuditConfig {
  /** 多资源操作时返回所有资源引用(如授用户角色同时涉及 user + role)。 */
  resourceRefs: AuditResourceRefsResolver;
  /** 多资源模式不可同时配置单资源快捷字段。 */
  resourceType?: never;
  resourceId?: never;
}

/**
 * audit() 中间件配置:声明式描述一个路由的审计行为。
 *
 * `resourceType/resourceId` 与 `resourceRefs` 是编译期互斥,运行时仍由 middleware.ts 做 fail-fast 校验。
 */
export type AuditConfig<TAction extends AuditActionDefinition = AuditActionDefinition>
  = AuditConfigBase<TAction> & (SingleResourceAuditConfig | MultiResourceAuditConfig);

/** writeAudit 接收的审计条目(audit() 中间件组装后传入)。 */
export interface AuditEntry {
  action: string;
  resourceRefs: readonly AuditResourceRef[];
  beforeState?: unknown;
  afterState?: unknown;
  relations?: readonly AuditRelationSpec[];
  metadata?: Record<string, unknown>;
  status: "success" | "failure";
  errorCode?: string;
  /** 手动传入 actor(认证事件不走 ALS)。不传则从 ALS 取。 */
  actorUserId?: string | null;
  /** 手动传入 actor 组织(认证事件不走 ALS)。不传则从 ALS 取。 */
  actorOrgId?: string | null;
  /** 手动传入 actor 名称快照(认证事件不走 ALS)。不传则从 ALS 取。 */
  actorNameSnapshot?: string | null;
}

/** 审计日志数据库记录(队列中流转,最终 INSERT 到 audit_logs 表)。 */
export interface AuditRecord {
  id: string;
  actorUserId: string | null;
  actorOrgId: string | null;
  actorRoleSnapshot: string | null;
  /** 操作者名称快照(写时从 session.user.name 存;历史不随改名漂移)。 */
  actorNameSnapshot: string | null;
  action: string;
  resourceRefs: AuditResourceRef[];
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
