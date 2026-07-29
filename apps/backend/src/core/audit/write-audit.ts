import type { AuditEntry, AuditRecord } from "./types.js";
import { generateId } from "@/db/schema/shared/index.js";
import { logger } from "../logger/index.js";
import { getAuditContext } from "./context.js";
import { enqueue } from "./queue.js";
import { resolveRelationNames, resolveResourceRefNames } from "./relation-resolvers.js";
import { sanitize } from "./sanitize.js";

/**
 * 组装审计记录并 fire-and-forget 入队。
 *
 * 流程:脱敏 -> 解析 resourceRefs 名称 -> 解析 before/after relations 名称 -> 计算 changedFields -> 入队。
 * actor/ip/ua/requestId 由 ALS 上下文自动注入,不从参数传。
 *
 * 认证事件(不走 audit() 中间件)也可直接调此函数,手动传 resourceRefs。
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    // 1. 脱敏 before/after
    const beforeSanitized = sanitize(entry.beforeState);
    const afterSanitized = sanitize(entry.afterState);

    // 2. 解析 resourceRefs 名称快照(历史快照,写入时查)
    const refsWithNames = await resolveResourceRefNames(entry.resourceRefs);

    // 3. 解析 before/after 的 relations 名称快照
    const beforeWithNames = await resolveRelationNames(beforeSanitized, entry.relations);
    const afterWithNames = await resolveRelationNames(afterSanitized, entry.relations);

    // 4. 计算 changedFields
    const changedFields = computeChangedFields(beforeSanitized, afterSanitized);

    // 5. 从 ALS 取 actor 上下文
    const ctx = getAuditContext();

    // 6. 组装记录入队
    const record: AuditRecord = {
      id: generateId(),
      actorUserId: ctx?.actorUserId ?? null,
      actorOrgId: ctx?.actorOrgId ?? null,
      actorRoleSnapshot: ctx?.actorRoleSnapshot ?? null,
      action: entry.action,
      resourceRefs: refsWithNames,
      beforeState: beforeWithNames,
      afterState: afterWithNames,
      changedFields,
      ipAddress: ctx?.ipAddress ?? null,
      userAgent: ctx?.userAgent ?? null,
      requestId: ctx?.requestId ?? null,
      status: entry.status,
      errorCode: entry.errorCode,
      metadata: entry.metadata,
    };

    enqueue(record);
  } catch (e) {
    // fire-and-forget 语义:审计写入失败不抛给调用方(避免 unhandled rejection 崩进程)。
    // 记录 error 日志确保可观测——审计记录可能丢失,但进程不受影响。
    logger.withError(e).withMetadata({ action: entry.action }).error("writeAudit failed, audit record lost");
  }
}

/**
 * 计算 before/after 的变更字段名数组。
 *
 * - before 为 null(create):所有 after 的 key
 * - after 为 null(delete):所有 before 的 key
 * - 两者都有:值不同的 key(对每个 key 比较 before[key] 和 after[key],
 *   基本类型用 ===,对象/数组用 JSON.stringify 值级比较)
 * - 两者都 null:null(无变更信息)
 *
 * 不直接 JSON.stringify(before) !== JSON.stringify(after):
 * key 顺序可能不同(before 来自 DB 查询固定顺序,after 来自响应体可能不同),
 * 导致假阳性 diff。
 */
function computeChangedFields(before: unknown, after: unknown): string[] | null {
  if (before == null && after == null) {
    return null;
  }
  if (before == null) {
    return Object.keys(after as Record<string, unknown>);
  }
  if (after == null) {
    return Object.keys(before);
  }
  if (typeof before !== "object" || typeof after !== "object") {
    return null;
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  return Array.from(allKeys).filter(key => !valuesEqual(beforeObj[key], afterObj[key]));
}

/** 值级比较:基本类型 ===,对象/数组用 JSON.stringify(此时只比较值内容,不受外层 key-order 影响)。 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b)
    return true;
  // null 已在 === 覆盖;此处处理 NaN(=== 不相等但语义相等)
  if (Number.isNaN(a) && Number.isNaN(b))
    return true;
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
