import { Buffer } from "node:buffer";
import { z } from "@hono/zod-openapi";

/**
 * 通用分页 schema + cursor 编解码,供各 feature 分页查询端点复用。
 *
 * - offset 分页:全局列表(需跳页 + 筛选)
 * - cursor 分页:时间线/动态流(顺序加载更多,性能好)
 *
 * cursor 用 `(occurredAt, id)` 复合游标,base64 编码,按 `occurred_at DESC, id DESC` 排序。
 */

/** offset 分页查询参数(全局列表用)。 */
export const OffsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** cursor 分页查询参数(时间线加载更多用)。 */
export const CursorPaginationQuerySchema = z.object({
  cursor: z.string().optional().openapi({
    description: "上一页最后一条记录返回的游标(opaque,首次请求不传)",
  }),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** offset 分页响应 meta。 */
export const OffsetMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

/** cursor 分页响应 meta。 */
export const CursorMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

/** 编码 cursor(base64 JSON)。 */
export function encodeCursor(data: { occurredAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

/** 解码 cursor(base64 JSON)。无效返回 null(调用方抛校验错误)。 */
export function decodeCursor(cursor: string): { occurredAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as unknown;
    if (parsed == null || typeof parsed !== "object") {
      return null;
    }
    const { occurredAt, id } = parsed as Record<string, unknown>;
    if (typeof occurredAt !== "string" || typeof id !== "string") {
      return null;
    }
    return { occurredAt, id };
  } catch {
    return null;
  }
}
