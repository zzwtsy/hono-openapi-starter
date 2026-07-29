import { z } from "@hono/zod-openapi";

import { CursorMetaSchema, OffsetMetaSchema } from "@/core/http/pagination.js";

/** 资源引用(含名称快照)。 */
export const ResourceRefSchema = z.object({
  type: z.string().openapi({ description: "资源类型", example: "user" }),
  id: z.string().openapi({ description: "资源 ID", example: "u1" }),
  name: z.string().nullable().optional().openapi({ description: "资源名称快照", example: "张三" }),
}).openapi("ResourceRef");

/** 审计日志条目。 */
export const AuditLogSchema = z.object({
  id: z.string().openapi({ description: "日志 ID" }),
  actorUserId: z.string().nullable().openapi({ description: "操作者 ID" }),
  actorOrgId: z.string().nullable().openapi({ description: "操作者组织 ID" }),
  action: z.string().openapi({ description: "业务动作", example: "projects.update" }),
  resourceRefs: z.unknown().openapi({ description: "资源引用数组 [{type,id,name?}]" }),
  beforeState: z.unknown().nullable().openapi({ description: "旧值快照(脱敏)" }),
  afterState: z.unknown().nullable().openapi({ description: "新值快照(脱敏)" }),
  changedFields: z.unknown().nullable().openapi({ description: "变更字段名数组" }),
  ipAddress: z.string().nullable().openapi({ description: "请求 IP" }),
  userAgent: z.string().nullable().openapi({ description: "请求 UA" }),
  requestId: z.string().nullable().openapi({ description: "请求 ID" }),
  status: z.enum(["success", "failure"]).openapi({ description: "操作结果" }),
  errorCode: z.string().nullable().openapi({ description: "失败错误码" }),
  metadata: z.unknown().nullable().openapi({ description: "业务自定义上下文" }),
  occurredAt: z.iso.datetime().openapi({ description: "发生时间(ISO 8601)" }),
}).openapi("AuditLog");

/** action 目录项。 */
export const AuditActionSchema = z.object({
  action: z.string().openapi({ description: "动作代码", example: "projects.update" }),
  label: z.string().openapi({ description: "中文标签", example: "修改项目" }),
}).openapi("AuditAction");

/** 全局审计列表查询参数(offset 分页 + 筛选)。 */
export const ListAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().optional().openapi({ description: "按动作过滤" }),
  actorUserId: z.string().optional().openapi({ description: "按操作者过滤" }),
  status: z.enum(["success", "failure"]).optional().openapi({ description: "按结果过滤" }),
  from: z.iso.datetime().optional().openapi({ description: "起始时间(ISO 8601)" }),
  to: z.iso.datetime().optional().openapi({ description: "截止时间(ISO 8601)" }),
});

/** by-resource 查询参数(cursor 分页)。 */
export const ListAuditLogsByResourceQuerySchema = z.object({
  cursor: z.string().optional().openapi({ description: "游标(首次不传)" }),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  resourceType: z.string().openapi({ description: "资源类型", example: "project" }),
  resourceId: z.string().openapi({ description: "资源 ID", example: "p1" }),
});

/** 全局审计列表响应(offset 分页)。 */
export const AuditLogListSchema = z.object({
  items: z.array(AuditLogSchema),
  meta: OffsetMetaSchema,
}).openapi("AuditLogList");

/** by-resource 时间线响应(cursor 分页)。 */
export const AuditLogTimelineSchema = z.object({
  items: z.array(AuditLogSchema),
  meta: CursorMetaSchema,
}).openapi("AuditLogTimeline");
