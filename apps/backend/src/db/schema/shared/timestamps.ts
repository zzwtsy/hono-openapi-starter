import { timestamp } from "drizzle-orm/pg-core";

/** 创建时间戳，默认当前时间，带时区。 */
export function createdAtColumn() {
  return timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull();
}

/** 更新时间戳，默认当前时间，更新时自动刷新，带时区。 */
export function updatedAtColumn() {
  return timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date());
}
