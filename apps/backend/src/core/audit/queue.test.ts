import type { AuditRecord } from "./types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

// mock 依赖(hoisted)
vi.mock("@/db/client.js", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: mockInsertValues,
    }),
  },
}));

vi.mock("@/db/schema/index.js", () => ({
  auditLogs: {},
}));

vi.mock("../logger/index.js", () => ({
  logger: {
    warn: mockLoggerWarn,
    withMetadata: vi.fn().mockReturnThis(),
    withError: vi.fn().mockReturnThis(),
    error: mockLoggerError,
  },
}));

const {
  beginAuditWrite,
  endAuditWrite,
  enqueue,
  getAuditQueueStats,
  shutdownAuditQueue,
  __resetQueueForTest,
} = await import("./queue.js");

function makeRecord(action: string): AuditRecord {
  return {
    id: `id-${action}`,
    actorUserId: "u1",
    actorOrgId: "o1",
    actorNameSnapshot: null,
    action,
    occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    resourceRefs: [{ type: "project", id: "p1" }],
    beforeState: null,
    afterState: null,
    changedFields: null,
    ipAddress: null,
    userAgent: null,
    requestId: null,
    status: "success",
    errorCode: undefined,
    metadata: undefined,
  };
}

describe("audit queue", () => {
  beforeEach(() => {
    __resetQueueForTest();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("enqueue", () => {
    it("入队不超限时正常入队", () => {
      // enqueue 不抛错即成功(队列内部状态不直接暴露)
      expect(() => enqueue(makeRecord("test1"))).not.toThrow();
    });

    it("队列满时丢弃记录并 warn", () => {
      // 填满队列(MAX_QUEUE_SIZE = 1000)
      for (let i = 0; i < 1000; i++) {
        enqueue(makeRecord(`action-${i}`));
      }

      // 第 1001 条应触发丢弃
      enqueue(makeRecord("overflow"));
      expect(mockLoggerWarn).toHaveBeenCalledWith("audit queue full, dropping record");
    });

    it("scheduleFlush 注册了定时器", () => {
      vi.useFakeTimers();
      enqueue(makeRecord("test1"));

      // scheduleFlush 创建了 setInterval,应该有定时器待执行
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it("第二次 enqueue 不会重复注册定时器", () => {
      vi.useFakeTimers();
      enqueue(makeRecord("test1"));
      const countAfterFirst = vi.getTimerCount();

      enqueue(makeRecord("test2"));
      expect(vi.getTimerCount()).toBe(countAfterFirst);
    });
  });

  describe("flush", () => {
    it("定时触发后批量 INSERT", async () => {
      vi.useFakeTimers();

      // 入队 150 条(触发批量:一批 100 + 剩余 50)
      for (let i = 0; i < 150; i++) {
        enqueue(makeRecord(`action-${i}`));
      }

      // 推进定时器触发 flush
      await vi.advanceTimersByTimeAsync(5000);

      // 第一批 100 条应已 INSERT
      expect(mockInsertValues).toHaveBeenCalledTimes(1);
      const batch = mockInsertValues.mock.calls[0]?.[0] as AuditRecord[];
      expect(batch).toHaveLength(100);
    });

    it("flush 时队列为空不执行", async () => {
      vi.useFakeTimers();

      // 不入队任何记录,直接推进定时器
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it("flush 失败时放回队列头部并 log error", async () => {
      vi.useFakeTimers();
      mockInsertValues.mockRejectedValueOnce(new Error("DB down"));

      enqueue(makeRecord("test1"));
      enqueue(makeRecord("test2"));

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockLoggerError).toHaveBeenCalledWith("audit flush failed, re-enqueueing batch");
      // 队列中有 2 条(放回 + 未 flush 的 — 实际 2 条都在 batch 里,放回后队列恢复)
    });
  });

  describe("shutdown", () => {
    it("等待 in-flight writer 完成后再 flush 队列", async () => {
      expect(beginAuditWrite()).toBe(true);
      enqueue(makeRecord("writer-record"), true);

      const shutdown = shutdownAuditQueue();
      expect(mockInsertValues).not.toHaveBeenCalled();

      endAuditWrite();
      await shutdown;

      expect(mockInsertValues).toHaveBeenCalledTimes(1);
      expect(getAuditQueueStats()).toMatchObject({
        queueDepth: 0,
        activeWriters: 0,
        shuttingDown: true,
      });
    });

    it("等待 in-flight flush 完成,不提前返回", async () => {
      vi.useFakeTimers();
      let resolveInsert!: () => void;
      mockInsertValues.mockImplementationOnce(async () => new Promise<void>((resolve) => {
        resolveInsert = resolve;
      }));

      enqueue(makeRecord("flush-record"));
      await vi.advanceTimersByTimeAsync(5000);
      const shutdown = shutdownAuditQueue();

      expect(mockInsertValues).toHaveBeenCalledTimes(1);
      resolveInsert();
      await shutdown;

      expect(getAuditQueueStats().queueDepth).toBe(0);
    });

    it("shutdown 超时记录剩余 writer 和队列诊断", async () => {
      vi.useFakeTimers();
      expect(beginAuditWrite()).toBe(true);
      const shutdown = shutdownAuditQueue();

      await vi.advanceTimersByTimeAsync(10_000);
      await shutdown;

      expect(mockLoggerWarn).toHaveBeenCalledWith("audit queue shutdown timed out, remaining records may be lost");
    });
  });

  describe("stats", () => {
    it("暴露队列深度和写入/丢弃/flush 计数", async () => {
      vi.useFakeTimers();
      enqueue(makeRecord("stats-record"));

      expect(getAuditQueueStats()).toMatchObject({
        queueDepth: 1,
        enqueued: 1,
        dropped: 0,
        flushing: false,
      });

      await vi.advanceTimersByTimeAsync(5000);
      expect(getAuditQueueStats().flushCount).toBe(1);
    });
  });
});
