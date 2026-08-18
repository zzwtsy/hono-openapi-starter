import type { z } from "@hono/zod-openapi";

import type { AuditLogSchema, AuditTimelineLogSchema } from "./schemas.js";
import type { AuditVisibilityActor } from "@/core/audit/index.js";

import { and, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getAuditResourceVisibilityPolicy } from "@/core/audit/index.js";
import { getRetentionCutoff } from "@/core/audit/retention.js";
import { AppError } from "@/core/errors/app-error.js";
import { decodeCursor, encodeCursor } from "@/core/http/pagination.js";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/index.js";
import { listRegisteredAuditActions } from "./audit-actions.js";

/** API 响应 DTO 类型(与 AuditLogSchema 同源,jsonb 列在 DB 边界显式转换)。 */
type AuditLogDto = z.infer<typeof AuditLogSchema>;
type AuditTimelineLogDto = z.infer<typeof AuditTimelineLogSchema>;

/** DB 行 -> DTO:jsonb 列在 drizzle 里是 unknown,在边界转成响应契约类型(唯一真相:AuditLogSchema)。 */
function toAuditLogDto(row: typeof auditLogs.$inferSelect): AuditLogDto {
  return {
    ...row,
    // actorName 是写时名称快照列(改名不污染历史);登录失败等无 actor 事件为 null
    actorName: row.actorNameSnapshot,
    resourceRefs: row.resourceRefs as AuditLogDto["resourceRefs"],
    beforeState: row.beforeState as AuditLogDto["beforeState"],
    afterState: row.afterState as AuditLogDto["afterState"],
    changedFields: row.changedFields as AuditLogDto["changedFields"],
    metadata: row.metadata as AuditLogDto["metadata"],
    // DB 列是 Date,响应契约是 ISO 8601 string(z.iso.datetime)
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
  };
}

/** DB 行 -> 时间线 DTO:只返回业务详情页需要的最小字段。 */
function toAuditTimelineLogDto(row: typeof auditLogs.$inferSelect): AuditTimelineLogDto {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorName: row.actorNameSnapshot,
    action: row.action,
    actionLabel: listRegisteredAuditActions().find(item => item.action === row.action)?.label ?? row.action,
    resourceRefs: row.resourceRefs as AuditTimelineLogDto["resourceRefs"],
    beforeState: row.beforeState as AuditTimelineLogDto["beforeState"],
    afterState: row.afterState as AuditTimelineLogDto["afterState"],
    changedFields: row.changedFields as AuditTimelineLogDto["changedFields"],
    status: row.status,
    errorCode: row.errorCode,
    occurredAt: row.occurredAt.toISOString(),
  };
}

/**
 * audit feature service:审计日志查询 + by-resource 可见性校验 + action 目录。
 *
 * - 全局列表按 actorOrgId 管理子树过滤(与 IAM 可见性语义一致)
 * - by-resource 用 GIN @> 查询,cursor 分页(时间线加载更多)
 * - by-resource 可见性校验按 resourceType 分派(复用各 feature 现有校验逻辑)
 * - 保留策略惰性过滤:查询时自动排除过期数据
 */
export const AuditService = {
  /** 全局审计列表(offset 分页 + 筛选 + 管理子树过滤)。 */
  async list(query: {
    page: number;
    pageSize: number;
    actions?: string[];
    actorUserId?: string;
    /** 按操作者名称模糊搜索(ilike,通配符 % 当通配符用)。 */
    actorKeyword?: string;
    status?: "success" | "failure";
    from?: string;
    to?: string;
    actorOrgIds: string[];
  }) {
    const conditions = [];

    // 管理子树过滤 + 无归属事件:actorOrgId IS NULL(登录失败等全局事件)任何管理员可见。
    // 系统级失败事件没有 actorOrgId；全局审计必须保留这些通常最需要调查的记录。
    conditions.push(or(
      inArray(auditLogs.actorOrgId, query.actorOrgIds),
      isNull(auditLogs.actorOrgId),
    ));

    // 保留策略惰性过滤
    const cutoff = getRetentionCutoff();
    if (cutoff != null) {
      conditions.push(gte(auditLogs.occurredAt, cutoff));
    }

    // 筛选条件
    if (query.actions != null && query.actions.length > 0) {
      conditions.push(inArray(auditLogs.action, query.actions));
    }
    if (query.actorUserId != null) {
      conditions.push(eq(auditLogs.actorUserId, query.actorUserId));
    }
    if (query.actorKeyword != null) {
      conditions.push(ilike(auditLogs.actorNameSnapshot, `%${query.actorKeyword}%`));
    }
    if (query.status != null) {
      conditions.push(eq(auditLogs.status, query.status));
    }
    if (query.from != null) {
      conditions.push(gte(auditLogs.occurredAt, new Date(query.from)));
    }
    if (query.to != null) {
      conditions.push(lte(auditLogs.occurredAt, new Date(query.to)));
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;

    // 并行查数据和 count(单表查询,无 join:actor 名称用写时快照列)
    const [items, [countRow]] = await Promise.all([
      db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.occurredAt), desc(auditLogs.id)).limit(query.pageSize).offset(offset),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(auditLogs).where(where),
    ]);

    const total = countRow?.count ?? 0;

    return {
      items: items.map(toAuditLogDto),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  },

  /** by-resource 时间线(cursor 分页,GIN @> 查询)。 */
  async listByResource(query: {
    resourceType: string;
    resourceId: string;
    cursor?: string;
    pageSize: number;
  }) {
    const conditions = [];

    // GIN @> 查询:resource_refs 包含 { type, id }
    conditions.push(
      sql`${auditLogs.resourceRefs} @> ${JSON.stringify([{ type: query.resourceType, id: query.resourceId }])}::jsonb`,
    );

    // 保留策略惰性过滤
    const cutoff = getRetentionCutoff();
    if (cutoff != null) {
      conditions.push(gte(auditLogs.occurredAt, cutoff));
    }

    // cursor 条件:(occurredAt, id) < (cursor.occurredAt, cursor.id)
    if (query.cursor != null) {
      const cursorData = decodeCursor(query.cursor);
      if (cursorData == null) {
        throw new AppError("COMMON_VALIDATION_FAILED");
      }
      conditions.push(
        or(
          lt(auditLogs.occurredAt, new Date(cursorData.occurredAt)),
          and(
            eq(auditLogs.occurredAt, new Date(cursorData.occurredAt)),
            lt(auditLogs.id, cursorData.id),
          ),
        ),
      );
    }

    const where = and(...conditions);

    // 多取 1 条判断 hasMore
    const items = await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.occurredAt), desc(auditLogs.id))
      .limit(query.pageSize + 1);

    const hasMore = items.length > query.pageSize;
    const pageItems = hasMore ? items.slice(0, -1) : items;
    const lastItem = pageItems[pageItems.length - 1];
    const nextCursor = hasMore && lastItem != null
      ? encodeCursor({ occurredAt: lastItem.occurredAt.toISOString(), id: lastItem.id })
      : null;

    return {
      items: pageItems.map(toAuditTimelineLogDto),
      meta: { nextCursor, hasMore },
    };
  },

  /** by-resource 可见性校验：按 resourceType 调用应用层已注册策略。 */
  async checkResourceVisibility(
    actor: AuditVisibilityActor,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    const policy = getAuditResourceVisibilityPolicy(resourceType);
    if (policy == null) {
      throw new AppError("COMMON_VALIDATION_FAILED");
    }
    await policy(actor, resourceId);
  },

  /** action 目录(前端渲染查表)。 */
  async listActions() {
    return listRegisteredAuditActions();
  },
};
