import type { AuditRecord } from "./types.js";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/index.js";
import { logger } from "../logger/index.js";

/**
 * 审计日志写入队列:有界缓冲 + 批量 flush + 可等待的进程退出 drain。
 *
 * - fire-and-forget 语义:writeAudit 入队后立即返回,不阻塞业务响应
 * - 有界队列满时丢弃 + warn(不阻塞业务)
 * - 后台定时 flush(5s),批量 INSERT(batch 100)
 * - flush 失败重试,超过 MAX_RETRIES 丢弃 + error(毒消息不阻塞队列)
 * - shutdown 先拒绝新 writer,等待 in-flight writer/flush 后再 flush 剩余记录
 * - 所有丢弃/重试日志携带 eventId/requestId/action/stage
 * - 定时器 `unref()`,不阻止进程退出
 */

const MAX_QUEUE_SIZE = 1000;
const FLUSH_INTERVAL_MS = 5000;
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const SHUTDOWN_TIMEOUT_MS = 10_000;

interface QueuedRecord {
  record: AuditRecord;
  retries: number;
}

export interface AuditQueueStats {
  queueDepth: number;
  activeWriters: number;
  flushing: boolean;
  shuttingDown: boolean;
  enqueued: number;
  dropped: number;
  flushCount: number;
  flushFailures: number;
  retryCount: number;
  permanentDropCount: number;
  lastFlushDurationMs: number | null;
}

const queue: QueuedRecord[] = [];
let timer: NodeJS.Timeout | undefined;
let activeFlush: Promise<void> | undefined;
let activeWriters = 0;
let shutdownPromise: Promise<void> | undefined;
let shuttingDown = false;

const counters = {
  enqueued: 0,
  dropped: 0,
  flushCount: 0,
  flushFailures: 0,
  retryCount: 0,
  permanentDropCount: 0,
  lastFlushDurationMs: null as number | null,
};

function recordFields(record: AuditRecord, stage: string, extra: Record<string, unknown> = {}) {
  return {
    eventId: record.id,
    requestId: record.requestId,
    action: record.action,
    stage,
    ...extra,
  };
}

/** 标记一个已开始的 writeAudit。shutdown 后的新 writer 会被拒绝。 */
export function beginAuditWrite(): boolean {
  if (shuttingDown) {
    return false;
  }
  activeWriters += 1;
  return true;
}

/** 标记 writeAudit 完成,供 shutdown drain 等待。 */
export function endAuditWrite(): void {
  activeWriters = Math.max(0, activeWriters - 1);
}

/** 入队一条审计记录。allowDuringShutdown 仅供 shutdown 前已开始的 writer 使用。 */
export function enqueue(record: AuditRecord, allowDuringShutdown = false): void {
  if (shuttingDown && !allowDuringShutdown) {
    counters.dropped += 1;
    logger
      .withMetadata(recordFields(record, "shutdown-reject"))
      .warn("audit write rejected during shutdown");
    return;
  }

  if (queue.length >= MAX_QUEUE_SIZE) {
    counters.dropped += 1;
    logger
      .withMetadata(recordFields(record, "enqueue-drop", { queueDepth: queue.length }))
      .warn("audit queue full, dropping record");
    return;
  }

  queue.push({ record, retries: 0 });
  counters.enqueued += 1;
  scheduleFlush();
}

function scheduleFlush(): void {
  if (timer != null || shuttingDown) {
    return;
  }
  timer = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);
  timer.unref();
}

/** 返回当前 flush promise;并发调用会等待同一个数据库操作。 */
async function flush(): Promise<void> {
  if (activeFlush != null) {
    return activeFlush;
  }
  if (queue.length === 0) {
    return Promise.resolve();
  }

  const tracked = flushBatch().finally(() => {
    if (activeFlush === tracked) {
      activeFlush = undefined;
    }
  });
  activeFlush = tracked;
  return tracked;
}

async function flushBatch(): Promise<void> {
  const startedAt = Date.now();
  const batch = queue.splice(0, BATCH_SIZE);

  try {
    await db.insert(auditLogs).values(batch.map(item => item.record));
  } catch (error) {
    counters.flushFailures += 1;
    logger
      .withError(error)
      .withMetadata({
        eventId: batch.length === 1 ? batch[0]?.record.id : "<batch>",
        requestId: batch.length === 1 ? batch[0]?.record.requestId : null,
        action: batch.length === 1 ? batch[0]?.record.action : "<batch>",
        stage: "flush",
        batchSize: batch.length,
        eventIds: batch.map(item => item.record.id),
        requestIds: batch.map(item => item.record.requestId),
        actions: batch.map(item => item.record.action),
      })
      .error("audit flush failed, re-enqueueing batch");

    for (const item of batch) {
      item.retries += 1;
      if (item.retries > MAX_RETRIES) {
        counters.permanentDropCount += 1;
        logger
          .withMetadata(recordFields(item.record, "flush-drop", { retries: item.retries }))
          .error("audit record exceeded max retries, dropping");
        continue;
      }

      counters.retryCount += 1;
      queue.push(item);
      logger
        .withMetadata(recordFields(item.record, "flush-retry", { retries: item.retries }))
        .warn("audit record re-enqueued after flush failure");
    }
  } finally {
    counters.flushCount += 1;
    counters.lastFlushDurationMs = Date.now() - startedAt;
  }
}

async function waitForWriters(deadline: number): Promise<boolean> {
  while (true) {
    if (activeWriters === 0) {
      return true;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return false;
    }
    await new Promise<void>(resolve => setTimeout(resolve, Math.min(25, remaining)));
  }
}

function logShutdownTimeout(): void {
  logger
    .withMetadata({
      stage: "shutdown-timeout",
      queueDepth: queue.length,
      activeWriters,
      flushing: activeFlush != null,
      eventIds: queue.slice(0, 20).map(item => item.record.id),
    })
    .warn("audit queue shutdown timed out, remaining records may be lost");
}

async function drainQueue(): Promise<void> {
  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
  const writersDrained = await waitForWriters(deadline);
  if (!writersDrained) {
    logShutdownTimeout();
    return;
  }

  while (queue.length > 0 || activeFlush != null) {
    if (Date.now() >= deadline) {
      logShutdownTimeout();
      return;
    }
    await flush();
  }
}

/** 停止接收新 writer,等待 in-flight writer/flush 并尽力写完剩余队列。 */
export async function shutdownAuditQueue(): Promise<void> {
  if (shutdownPromise != null) {
    return shutdownPromise;
  }

  shuttingDown = true;
  if (timer != null) {
    clearInterval(timer);
    timer = undefined;
  }
  shutdownPromise = drainQueue();
  return shutdownPromise;
}

/** 读取最小队列运行指标,供健康检查/metrics adapter 使用。 */
export function getAuditQueueStats(): AuditQueueStats {
  return {
    queueDepth: queue.length,
    activeWriters,
    flushing: activeFlush != null,
    shuttingDown,
    ...counters,
  };
}

// --- 测试辅助(仅 vitest 使用,不在 index.ts 导出) ---
/** 重置队列内部状态(每个测试用例前调用,确保隔离)。 */
export function __resetQueueForTest(): void {
  queue.length = 0;
  activeFlush = undefined;
  activeWriters = 0;
  shutdownPromise = undefined;
  shuttingDown = false;
  Object.assign(counters, {
    enqueued: 0,
    dropped: 0,
    flushCount: 0,
    flushFailures: 0,
    retryCount: 0,
    permanentDropCount: 0,
    lastFlushDurationMs: null,
  });
  if (timer != null) {
    clearInterval(timer);
    timer = undefined;
  }
}
