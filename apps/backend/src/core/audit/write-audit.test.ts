import { describe, expect, it, vi } from "vitest";

import { writeAudit } from "./write-audit.js";

// mock 依赖
vi.mock("@/db/schema/shared/index.js", () => ({
  generateId: () => "test-uuid",
}));

vi.mock("./queue.js", () => ({
  beginAuditWrite: vi.fn().mockReturnValue(true),
  endAuditWrite: vi.fn(),
  enqueue: vi.fn(),
}));

vi.mock("./relation-resolvers.js", () => ({
  resolveResourceRefNames: vi.fn(async (refs: Array<{ type: string; id: string }>) =>
    refs.map(r => ({ ...r, name: "resolved-name" })),
  ),
  resolveRelationNames: vi.fn(async (data: unknown) => data),
}));

vi.mock("./context.js", () => ({
  getAuditContext: () => ({
    actorUserId: "actor-1",
    actorOrgId: "org-1",
    actorNameSnapshot: "张三",
    ipAddress: "1.2.3.4",
    userAgent: "test-ua",
    requestId: "req-1",
  }),
}));

// writeAudit 内部 try/catch 需 logger(避免模块级 import 触发 env 校验)。
vi.mock("../logger/index.js", () => ({
  logger: {
    withError: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const { enqueue } = await import("./queue.js");

function lastEnqueuedRecord() {
  const calls = vi.mocked(enqueue).mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe("writeAudit", () => {
  it("组装 record 并入队,从 ALS 注入 actor 上下文", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "projects.create",
      resourceRefs: [{ type: "project", id: "p1" }],
      afterState: { name: "项目A" },
      status: "success",
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(lastEnqueuedRecord()).toMatchObject({
      id: "test-uuid",
      actorUserId: "actor-1",
      actorOrgId: "org-1",
      actorNameSnapshot: "张三",
      action: "projects.create",
      status: "success",
      ipAddress: "1.2.3.4",
      requestId: "req-1",
    });
    expect(lastEnqueuedRecord()?.resourceRefs).toEqual([
      { type: "project", id: "p1", name: "resolved-name" },
    ]);
  });

  it("脱敏 before/after 里的敏感字段", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "iam.user.update",
      resourceRefs: [{ type: "user", id: "u1" }],
      beforeState: { name: "张三", password: "old" },
      afterState: { name: "李四", password: "new" },
      status: "success",
    });

    expect(lastEnqueuedRecord()?.beforeState).toMatchObject({ password: "[REDACTED]" });
    expect(lastEnqueuedRecord()?.afterState).toMatchObject({ password: "[REDACTED]" });
  });

  it("changedFields: create 时为 after 的所有 key", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "projects.create",
      resourceRefs: [{ type: "project", id: "p1" }],
      afterState: { name: "项目A", orgId: "o1" },
      status: "success",
    });

    expect(lastEnqueuedRecord()?.changedFields).toEqual(expect.arrayContaining(["name", "orgId"]));
  });

  it("changedFields: update 时为值不同的 key", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "projects.update",
      resourceRefs: [{ type: "project", id: "p1" }],
      beforeState: { name: "旧名", orgId: "o1" },
      afterState: { name: "新名", orgId: "o1" },
      status: "success",
    });

    expect(lastEnqueuedRecord()?.changedFields).toEqual(["name"]);
  });

  it("failure 时记 errorCode", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "projects.create",
      resourceRefs: [{ type: "project", id: "p1" }],
      status: "failure",
      errorCode: "PROJECT_NAME_CONFLICT",
    });

    expect(lastEnqueuedRecord()?.status).toBe("failure");
    expect(lastEnqueuedRecord()?.errorCode).toBe("PROJECT_NAME_CONFLICT");
  });

  it("failure 时 changedFields 置 null(before/after 有值也不展示变更)", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "projects.update",
      resourceRefs: [{ type: "project", id: "p1" }],
      beforeState: { name: "旧名" },
      afterState: { name: "新名" },
      status: "failure",
      errorCode: "PROJECT_NAME_CONFLICT",
    });

    expect(lastEnqueuedRecord()?.status).toBe("failure");
    expect(lastEnqueuedRecord()?.changedFields).toBeNull();
  });

  it("changedFields: after 为非对象时返回 null(边界)", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "projects.create",
      resourceRefs: [{ type: "project", id: "p1" }],
      afterState: "unexpected-string",
      status: "success",
    });

    expect(lastEnqueuedRecord()?.changedFields).toBeNull();
  });

  it("after 未捕获时不生成伪 diff", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "projects.delete",
      resourceRefs: [{ type: "project", id: "p1" }],
      beforeState: { id: "p1", name: "项目A" },
      status: "success",
    });

    expect(lastEnqueuedRecord()?.changedFields).toBeNull();
  });

  it("metadata 使用通用 sanitize 且 Date 快照转为 ISO", async () => {
    vi.clearAllMocks();
    await writeAudit({
      action: "settings.update",
      resourceRefs: [{ type: "setting", id: "site-name" }],
      beforeState: { updatedAt: new Date("2026-01-02T03:04:05.000Z") },
      metadata: { token: "secret", updatedAt: new Date("2026-01-02T03:04:05.000Z") },
      status: "success",
    });

    expect(lastEnqueuedRecord()?.beforeState).toEqual({ updatedAt: "2026-01-02T03:04:05.000Z" });
    expect(lastEnqueuedRecord()?.metadata).toEqual({
      token: "[REDACTED]",
      updatedAt: "2026-01-02T03:04:05.000Z",
    });
  });
});
