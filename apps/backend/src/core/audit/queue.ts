import type { AuditRecord } from "./types.js";
import process from "node:process";

import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/index.js";
import { logger } from "../logger/index.js";

/**
 * 审计日志写入队列:有界缓冲 + 批量 flush + 进程退出 flush。
 *
 * - fire-and-forget 语义:writeAudit 入队后立即返回,不阻塞业务响应
 * - 有界队列满时丢弃 + warn(不阻塞业务)
 * - 后台定时 flush(5s),批量 INSERT(batch 100)
 * - flush 失败重试,超过 MAX_RETRIES 丢弃 + error(毒消息不阻塞队列)
 * - `beforeExit` / `SIGTERM` / `SIGINT` 尽力 flush 剩余记录
 * - 定时器 `unref()`,不阻止进程退出
 */

const MAX_QUEUE_SIZE = 1000;
const FLUSH_INTERVAL_MS = 5000;
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

interface QueuedRecord {
  record: AuditRecord;
  retries: number;
}

const queue: QueuedRecord[] = [];
let flushing = false;
let timer: NodeJS.Timeout | undefined;
let shuttingDown = false;

/** 入队一条审计记录。队列满时丢弃并记 warn。 */
export function enqueue(record: AuditRecord): void {
  if (queue.length >= MAX_QUEUE_SIZE) {
    logger.withMetadata({ action: record.action }).warn("audit queue full, dropping record");
    return;
  }
  queue.push({ record, retries: 0 });
  scheduleFlush();
}

function scheduleFlush(): void {
  if (timer != null) {
    return;
  }
  timer = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);
  timer.unref();
}

async function flush(): Promise<void> {
  if (flushing || queue.length === 0) {
    return;
  }

  flushing = true;
  const batch = queue.splice(0, BATCH_SIZE);

  try {
    await db.insert(auditLogs).values(batch.map(item => item.record));
  } catch (e) {
    logger.withError(e).error("audit flush failed, re-enqueueing batch");
    for (const item of batch) {
      item.retries += 1;
      if (item.retries > MAX_RETRIES) {
        logger
          .withMetadata({ action: item.record.action })
          .error("audit record exceeded max retries, dropping");
        continue;
      }
      queue.push(item);
    }
  } finally {
    flushing = false;
  }
}

/** 进程退出时尽力 flush 剩余记录。 */
async function flushAll(): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  if (timer != null) {
    clearInterval(timer);
    timer = undefined;
  }
  while (queue.length > 0) {
    await flush();
  }
}

process.on("beforeExit", () => {
  void flushAll();
});

// SIGTERM/SIGINT:容器/PM 关闭时尽力 flush(beforeExit 不覆盖信号场景)。
for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    void flushAll().finally(() => {
      process.exit(0);
    });
  });
}

// --- 测试辅助(仅 vitest 使用,不在 index.ts 导出) ---
/** 重置队列内部状态(每个测试用例前调用,确保隔离)。 */
export function __resetQueueForTest(): void {
  queue.length = 0;
  flushing = false;
  shuttingDown = false;
  if (timer != null) {
    clearInterval(timer);
    timer = undefined;
  }
}
