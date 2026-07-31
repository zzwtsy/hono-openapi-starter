import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn } from "./shared/index.js";

/**
 * 审计日志表:全项目通用操作日志,记录 who/what/when/where/change/outcome。
 *
 * - `resource_refs` 存资源引用数组(支持多资源),GIN 索引加速 `@>` 查询
 * - `before_state`/`after_state` 存脱敏后的 JSON 快照,`_names` 子字段存关联名称历史快照
 * - `changed_fields` 存变更字段名数组,前端时间线摘要展示用
 * - append-only:应用层自律(writeAudit 只 INSERT),不提供 update/delete 接口
 * - 保留策略:env `AUDIT_LOG_RETENTION_DAYS` 控制,查询时惰性过滤 + 定时物理删除
 *
 * 设计见 docs/adr/0009-audit-log.md(待补,功能未完整)。
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: idColumn(),
    /** 操作者 id(可空:未认证动作如登录失败)。ALS 注入。 */
    actorUserId: text("actor_user_id"),
    /** 操作者组织快照(管理子树过滤用)。ALS 注入。 */
    actorOrgId: text("actor_org_id"),
    /** 操作者角色快照(角色会变,记当时的)。阶段 1 暂不填。 */
    actorRoleSnapshot: text("actor_role_snapshot"),
    /** 业务动作,如 `projects.update`。 */
    action: text("action").notNull(),
    /** 资源引用数组:`[{"type":"user","id":"u1","name":"张三"}]`,name 是写入时解析的快照。 */
    resourceRefs: jsonb("resource_refs").notNull(),
    /** 旧值快照(脱敏后),含 `_names` 名称快照。 */
    beforeState: jsonb("before_state"),
    /** 新值快照(脱敏后),含 `_names` 名称快照。 */
    afterState: jsonb("after_state"),
    /** 变更字段名数组,如 `["name","orgId"]`。 */
    changedFields: jsonb("changed_fields"),
    /** 请求 IP。 */
    ipAddress: text("ip_address"),
    /** 请求 UA。 */
    userAgent: text("user_agent"),
    /** 请求 ID(复用 X-Request-Id)。 */
    requestId: text("request_id"),
    /** 操作结果。 */
    status: text("status", { enum: ["success", "failure"] }).notNull(),
    /** 失败时的错误码。 */
    errorCode: text("error_code"),
    /** 业务自定义上下文。 */
    metadata: jsonb("metadata"),
    /** 发生时间(= 创建时间,带时区,服务端 defaultNow)。 */
    occurredAt: createdAtColumn(),
  },
  t => [
    index("audit_logs_occurred_at_idx").on(t.occurredAt),
    index("audit_logs_actor_user_idx").on(t.actorUserId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_actor_org_idx").on(t.actorOrgId),
    // GIN 索引加速 by-resource 查询:WHERE resource_refs @> '[{"type":"user","id":"xxx"}]'
    index("audit_logs_resource_refs_idx").using("gin", t.resourceRefs),
  ],
);
