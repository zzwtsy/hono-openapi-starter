import { lt } from "drizzle-orm";

import env from "@/config/env.js";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/index.js";
import { logger } from "../logger/index.js";

/**
 * 审计日志保留策略:惰性过滤 + 定时物理删除。
 *
 * - **惰性过滤**:查询时自动过滤 `occurred_at < cutoff`(不返回过期数据),
 *   即使定时任务没跑也不会返回过期数据。`AUDIT_LOG_RETENTION_DAYS = 0` 时不过滤。
 * - **定时物理删除**:进程启动时 `setInterval` 注册(每小时),物理删超期记录。
 *   serverless/容器重启场景定时任务可能不执行,但惰性过滤保证查询正确性。
 */

const RETENTION_DAYS = env.AUDIT_LOG_RETENTION_DAYS;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 小时

/** 保留期 cutoff 时间点,供 service 层 WHERE 用。null 表示不过滤(永久保留)。 */
export function getRetentionCutoff(): Date | null {
  if (RETENTION_DAYS === 0) {
    return null;
  }
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

let cleanupTimer: NodeJS.Timeout | undefined;

/** 启动定时物理删除(进程启动时调一次)。RETENTION_DAYS=0 时不启动。 */
export function startRetentionCleanup(): void {
  if (RETENTION_DAYS === 0 || cleanupTimer != null) {
    return;
  }
  cleanupTimer = setInterval(() => {
    void cleanupExpired();
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

/** 停止定时物理删除；由 application lifecycle 在关闭阶段显式调用。 */
export function stopRetentionCleanup(): void {
  if (cleanupTimer != null) {
    clearInterval(cleanupTimer);
    cleanupTimer = undefined;
  }
}

async function cleanupExpired(): Promise<void> {
  try {
    const cutoff = getRetentionCutoff();
    if (cutoff == null) {
      return;
    }
    await db.delete(auditLogs).where(lt(auditLogs.occurredAt, cutoff));
  } catch (e) {
    // 定时清理失败不崩进程(惰性过滤保证查询不返回过期数据)。
    logger.withError(e).error("audit retention cleanup failed");
  }
}
