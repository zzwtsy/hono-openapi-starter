import { describe, expect, it, vi } from "vitest";

import { writeAudit } from "./write-audit.js";

// mock 依赖
vi.mock("@/db/schema/shared/index.js", () => ({
  generateId: () => "test-uuid",
}));

vi.mock("./queue.js", () => ({
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
    actorRoleSnapshot: null,
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
  },
}));

const { enqueue } = await import("./queue.js");

describe("writeAudit", () => {
  it("组装 record 并入队,从 ALS 注入 actor 上下文", async () => {
    await writeAudit({
      action: "projects.create",
      resourceRefs: [{ type: "project", id: "p1" }],
      afterState: { name: "项目A" },
      status: "success",
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    const record = vi.mocked(enqueue).mock.calls[0]?.[0];
    expect(record).toMatchObject({
      id: "test-uuid",
      actorUserId: "actor-1",
      actorOrgId: "org-1",
      action: "projects.create",
      status: "success",
      ipAddress: "1.2.3.4",
      requestId: "req-1",
    });
    expect(record?.resourceRefs).toEqual([
      { type: "project", id: "p1", name: "resolved-name" },
    ]);
  });

  it("脱敏 before/after 里的敏感字段", async () => {
    await writeAudit({
      action: "iam.user.update",
      resourceRefs: [{ type: "user", id: "u1" }],
      beforeState: { name: "张三", password: "old" },
      afterState: { name: "李四", password: "new" },
      status: "success",
    });

    const record = vi.mocked(enqueue).mock.calls[1]?.[0];
    expect(record?.beforeState).toMatchObject({ password: "[REDACTED]" });
    expect(record?.afterState).toMatchObject({ password: "[REDACTED]" });
  });

  it("changedFields: create 时为 after 的所有 key", async () => {
    await writeAudit({
      action: "projects.create",
      resourceRefs: [{ type: "project", id: "p1" }],
      afterState: { name: "项目A", orgId: "o1" },
      status: "success",
    });

    const record = vi.mocked(enqueue).mock.calls[2]?.[0];
    expect(record?.changedFields).toEqual(expect.arrayContaining(["name", "orgId"]));
  });

  it("changedFields: update 时为值不同的 key", async () => {
    await writeAudit({
      action: "projects.update",
      resourceRefs: [{ type: "project", id: "p1" }],
      beforeState: { name: "旧名", orgId: "o1" },
      afterState: { name: "新名", orgId: "o1" },
      status: "success",
    });

    const record = vi.mocked(enqueue).mock.calls[3]?.[0];
    expect(record?.changedFields).toEqual(["name"]);
  });

  it("failure 时记 errorCode", async () => {
    await writeAudit({
      action: "projects.create",
      resourceRefs: [{ type: "project", id: "p1" }],
      status: "failure",
      errorCode: "PROJECT_NAME_CONFLICT",
    });

    const record = vi.mocked(enqueue).mock.calls[4]?.[0];
    expect(record?.status).toBe("failure");
    expect(record?.errorCode).toBe("PROJECT_NAME_CONFLICT");
  });
});
