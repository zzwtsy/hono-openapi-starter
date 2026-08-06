import { z } from "@hono/zod-openapi";

import {
  CursorMetaSchema,
  CursorPaginationQuerySchema,
  OffsetMetaSchema,
  OffsetPaginationQuerySchema,
} from "@/core/http/pagination.js";

/** 资源引用(含名称快照)。 */
export const ResourceRefSchema = z.object({
  type: z.string().openapi({ description: "资源类型", example: "user" }),
  id: z.string().openapi({ description: "资源 ID", example: "u1" }),
  name: z.string().nullable().optional().openapi({ description: "资源名称快照", example: "张三" }),
}).openapi("ResourceRef");

/**
 * 审计快照和元数据使用的 JSON 值模式。
 *
 * 必须使用显式引用：当前 zod-openapi 生成器无法展开未命名的递归
 * z.json()/z.lazy() 模式，否则会导致栈溢出。
 * 显式 OpenAPI 结构同样是有意为之：递归 Zod 联合推断出可空分支时，
 * 生成器会将递归引用包成 `allOf + nullable`，wormhole 会将其生成成 `JsonValue & null`。
 */
const AuditJsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(AuditJsonValueSchema),
  z.record(z.string(), AuditJsonValueSchema),
])).openapi("AuditJsonValue", {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { nullable: true },
    { type: "array", items: { $ref: "#/components/schemas/AuditJsonValue" } },
    { type: "object", additionalProperties: { $ref: "#/components/schemas/AuditJsonValue" } },
  ],
});

const AuditSnapshotSchema = z.union([
  z.array(AuditJsonValueSchema),
  z.record(z.string(), AuditJsonValueSchema),
]).nullable();

/** 审计日志条目。 */
export const AuditLogSchema = z.object({
  id: z.string().openapi({ description: "日志 ID" }),
  actorUserId: z.string().nullable().openapi({ description: "操作者 ID" }),
  actorName: z.string().nullable().openapi({ description: "操作者名称(写时快照,改名不污染历史)" }),
  actorOrgId: z.string().nullable().openapi({ description: "操作者组织 ID" }),
  action: z.string().openapi({ description: "业务动作", example: "projects.update" }),
  resourceRefs: z.array(ResourceRefSchema).openapi({ description: "资源引用数组 [{type,id,name?}]" }),
  beforeState: AuditSnapshotSchema.openapi({
    description: "旧值快照(脱敏),对象或数组",
  }),
  afterState: AuditSnapshotSchema.openapi({
    description: "新值快照(脱敏),对象或数组",
  }),
  changedFields: z.array(z.string()).nullable().openapi({ description: "变更字段名数组" }),
  ipAddress: z.string().nullable().openapi({ description: "请求 IP" }),
  userAgent: z.string().nullable().openapi({ description: "请求 UA" }),
  requestId: z.string().nullable().openapi({ description: "请求 ID" }),
  status: z.enum(["success", "failure"]).openapi({ description: "操作结果" }),
  errorCode: z.string().nullable().openapi({ description: "失败错误码" }),
  metadata: z.record(z.string(), AuditJsonValueSchema).nullable().openapi({ description: "业务自定义上下文" }),
  occurredAt: z.iso.datetime().openapi({ description: "业务发生时间(ISO 8601)" }),
  recordedAt: z.iso.datetime().openapi({ description: "审计入库时间(ISO 8601)" }),
}).openapi("AuditLog");

/** 资源时间线条目:仅返回业务详情页展示所需字段,不暴露请求取证字段。 */
export const AuditTimelineLogSchema = AuditLogSchema.pick({
  id: true,
  actorUserId: true,
  actorName: true,
  action: true,
  resourceRefs: true,
  beforeState: true,
  afterState: true,
  changedFields: true,
  status: true,
  errorCode: true,
  occurredAt: true,
}).extend({
  actionLabel: z.string().openapi({ description: "动作展示名称", example: "修改项目" }),
}).openapi("AuditTimelineLog");

/** action 目录项。 */
export const AuditActionSchema = z.object({
  action: z.string().openapi({ description: "动作代码", example: "projects.update" }),
  label: z.string().openapi({ description: "中文标签", example: "修改项目" }),
}).openapi("AuditAction");

/** 全局审计列表查询参数(offset 分页 + 筛选)。 */
export const ListAuditLogsQuerySchema = OffsetPaginationQuerySchema.extend({
  action: z.string().optional().openapi({ description: "按动作过滤" }),
  actorUserId: z.string().optional().openapi({ description: "按操作者 ID 过滤" }),
  actorKeyword: z.string().optional().openapi({ description: "按操作者名称模糊搜索" }),
  status: z.enum(["success", "failure"]).optional().openapi({ description: "按结果过滤" }),
  from: z.iso.datetime().optional().openapi({ description: "起始时间(ISO 8601)" }),
  to: z.iso.datetime().optional().openapi({ description: "截止时间(ISO 8601)" }),
}).openapi("ListAuditLogsQuery");

/** by-resource 查询参数(cursor 分页)。 */
export const ListAuditLogsByResourceQuerySchema = CursorPaginationQuerySchema.extend({
  resourceType: z.string().openapi({ description: "资源类型", example: "project" }),
  resourceId: z.string().openapi({ description: "资源 ID", example: "p1" }),
}).openapi("ListAuditLogsByResourceQuery");

/** 全局审计列表响应(offset 分页)。 */
export const AuditLogListSchema = z.object({
  items: z.array(AuditLogSchema),
  meta: OffsetMetaSchema,
}).openapi("AuditLogList");

/** by-resource 时间线响应(cursor 分页)。 */
export const AuditLogTimelineSchema = z.object({
  items: z.array(AuditTimelineLogSchema),
  meta: CursorMetaSchema,
}).openapi("AuditLogTimeline");
