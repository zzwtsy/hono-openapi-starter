import type { SQL } from "drizzle-orm";

import { Buffer } from "node:buffer";

import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditService } from "./service.js";

// 依赖 mock:db 用链式 fake(按调用顺序消费结果队列),其余纯替身。
const {
  mockSelect,
  mockGetRetentionCutoff,
  mockGetAuditResourceVisibilityPolicy,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockGetRetentionCutoff: vi.fn(),
  mockGetAuditResourceVisibilityPolicy: vi.fn(),
}));

vi.mock("@/db/client.js", () => ({ db: { select: mockSelect } }));
vi.mock("@/core/audit/retention.js", () => ({
  getRetentionCutoff: mockGetRetentionCutoff,
  startRetentionCleanup: vi.fn(),
}));
vi.mock("@/core/audit/index.js", () => ({
  getAuditResourceVisibilityPolicy: mockGetAuditResourceVisibilityPolicy,
}));

/** 链式 db fake:select().from().where()... 按调用顺序消费 results 队列;where 条件被捕获供 SQL 断言。 */
function mockDbChain(results: unknown[][]) {
  let index = 0;
  const next = () => results[index++] ?? [];
  const captured: unknown[] = [];
  const chain = {
    select: () => chain,
    from: () => chain,
    where: (cond: unknown) => {
      captured.push(cond);
      return chain;
    },
    orderBy: () => chain,
    limit: () => chain,
    offset: async () => Promise.resolve(next()),
    then: <T>(onfulfilled: (value: unknown[]) => T | PromiseLike<T>): PromiseLike<T> =>
      Promise.resolve(onfulfilled(next())),
  };
  mockSelect.mockReturnValue(chain);
  return { captured, chain };
}

/** where 条件转 SQL 查询(sql 文本 + 参数,断言谓词)。 */
function sqlQuery(cond: unknown): { sql: string; params: unknown[] } {
  const query = new PgDialect().sqlToQuery(cond as SQL);
  return { sql: query.sql, params: query.params };
}

/** 审计日志 DB 行($inferSelect 形状,含 actorNameSnapshot 快照列)。 */
function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "log-1",
    actorUserId: "u1",
    actorNameSnapshot: "张三",
    actorOrgId: "org-a",
    action: "projects.update",
    resourceRefs: [{ type: "project", id: "p1", name: "项目A" }],
    beforeState: { name: "旧名" },
    afterState: { name: "新名" },
    changedFields: ["name"],
    ipAddress: "1.2.3.4",
    userAgent: "test-ua",
    requestId: "req-1",
    status: "success",
    errorCode: null,
    metadata: { clearAllGrants: false },
    occurredAt: new Date("2026-07-01T00:00:00.000Z"),
    recordedAt: new Date("2026-07-01T00:00:01.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRetentionCutoff.mockReturnValue(null); // 默认不过滤
});

describe("AuditService.list", () => {
  it("分页 meta 计算 + DB 行转 DTO(occurredAt ISO、jsonb 透传、actorName 直通)", async () => {
    mockDbChain([[row()], [{ count: 1 }]]);

    const result = await AuditService.list({ page: 2, pageSize: 25, actorOrgIds: ["org-a"] });

    expect(result.meta).toEqual({ page: 2, pageSize: 25, total: 1, totalPages: 1 });
    expect(result.items[0]).toMatchObject({
      id: "log-1",
      action: "projects.update",
      status: "success",
      actorName: "张三",
      occurredAt: "2026-07-01T00:00:00.000Z",
      recordedAt: "2026-07-01T00:00:01.000Z",
      resourceRefs: [{ type: "project", id: "p1", name: "项目A" }],
    });
  });

  it("子树过滤 + 无归属事件:WHERE 含 actor_org_id in 子树 OR actor_org_id is null", async () => {
    const { captured } = mockDbChain([[], [{ count: 0 }]]);

    await AuditService.list({ page: 1, pageSize: 25, actorOrgIds: ["org-a", "org-b"] });

    const { sql, params } = sqlQuery(captured[0]);
    expect(sql).toContain("actor_org_id");
    expect(sql).toContain("is null");
    expect(sql).toMatch(/ or /);
    expect(params).toContain("org-a");
    expect(params).toContain("org-b");
  });

  it("筛选条件:actions/actorUserId/status/from/to 都进 WHERE", async () => {
    const { captured } = mockDbChain([[], [{ count: 0 }]]);

    await AuditService.list({
      page: 1,
      pageSize: 25,
      actorOrgIds: ["org-a"],
      actions: ["projects.update", "iam.user.create"],
      actorUserId: "u1",
      status: "failure",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
    });

    const { sql, params } = sqlQuery(captured[0]);
    expect(sql).toContain("action");
    expect(sql).toContain("actor_user_id");
    expect(sql).toContain("status");
    expect(sql).toContain("occurred_at");
    expect(sql).toMatch(/action.*in/i);
    expect(params).toEqual(expect.arrayContaining(["projects.update", "iam.user.create", "u1", "failure"]));
  });

  it("actions 空数组等价于未筛选", async () => {
    const { captured } = mockDbChain([[], [{ count: 0 }]]);

    await AuditService.list({ page: 1, pageSize: 25, actorOrgIds: ["org-a"], actions: [] });

    expect(sqlQuery(captured[0]).sql).not.toContain("\"audit_logs\".\"action\"");
  });

  it("actorName 为 null(登录失败等无 actor 事件):DTO 直通 null", async () => {
    mockDbChain([[row({ actorNameSnapshot: null })], [{ count: 1 }]]);

    const result = await AuditService.list({ page: 1, pageSize: 25, actorOrgIds: ["org-a"] });

    expect(result.items[0].actorName).toBeNull();
  });

  it("actorKeyword:WHERE 含 actor_name_snapshot ilike 谓词与参数", async () => {
    const { captured } = mockDbChain([[], [{ count: 0 }]]);

    await AuditService.list({ page: 1, pageSize: 25, actorOrgIds: ["org-a"], actorKeyword: "张" });

    const { sql, params } = sqlQuery(captured[0]);
    expect(sql).toContain("ilike");
    expect(sql).toContain("actor_name_snapshot");
    expect(params).toContain("%张%");
  });

  it("count 查询与 items 共享同一 where(含 actorKeyword 谓词)", async () => {
    const { captured } = mockDbChain([[], [{ count: 0 }]]);

    await AuditService.list({ page: 1, pageSize: 25, actorOrgIds: ["org-a"], actorKeyword: "张" });

    // items 与 count 各调一次 where,同一条件对象(引用相等)
    expect(captured).toHaveLength(2);
    expect(captured[1]).toBe(captured[0]);
    expect(sqlQuery(captured[1]).sql).toContain("ilike");
  });

  it("保留策略:cutoff 非 null 时 WHERE 含 occurred_at >= cutoff", async () => {
    mockGetRetentionCutoff.mockReturnValue(new Date("2026-06-01T00:00:00.000Z"));
    const { captured } = mockDbChain([[], [{ count: 0 }]]);

    await AuditService.list({ page: 1, pageSize: 25, actorOrgIds: ["org-a"] });

    const { sql, params } = sqlQuery(captured[0]);
    expect(sql).toContain("occurred_at");
    expect(sql).toMatch(/>=/);
    expect(params).toContain("2026-06-01T00:00:00.000Z");
  });

  it("保留策略关闭(cutoff null):WHERE 不含 occurred_at 谓词", async () => {
    const { captured } = mockDbChain([[], [{ count: 0 }]]);

    await AuditService.list({ page: 1, pageSize: 25, actorOrgIds: ["org-a"] });

    expect(sqlQuery(captured[0]).sql).not.toContain("occurred_at");
  });
});

describe("AuditService.listByResource", () => {
  it("首页多取 1 条判断 hasMore,nextCursor 基于最后一条 (occurredAt, id)", async () => {
    mockDbChain([
      [row({ id: "log-1", occurredAt: new Date("2026-07-01T00:00:00.000Z") }), row({ id: "log-2", occurredAt: new Date("2026-07-02T00:00:00.000Z") }), row({ id: "log-3", occurredAt: new Date("2026-07-03T00:00:00.000Z") })],
    ]);

    const result = await AuditService.listByResource({ resourceType: "project", resourceId: "p1", pageSize: 2 });

    expect(result.items.map(i => i.id)).toEqual(["log-1", "log-2"]);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBeTruthy();
    expect(result.items[0]).toMatchObject({
      actionLabel: "projects.update",
      actorName: "张三",
      resourceRefs: [{ type: "project", id: "p1", name: "项目A" }],
    });
    expect(result.items[0]).not.toHaveProperty("ipAddress");
    expect(result.items[0]).not.toHaveProperty("userAgent");
    expect(result.items[0]).not.toHaveProperty("requestId");
    // 游标可解码回最后一条的时间 + id
    const decoded = JSON.parse(Buffer.from(result.meta.nextCursor!, "base64").toString("utf8")) as { occurredAt: string; id: string };
    expect(decoded).toEqual({ occurredAt: "2026-07-02T00:00:00.000Z", id: "log-2" });
  });

  it("末页:hasMore false,nextCursor null", async () => {
    mockDbChain([[row({ id: "log-1" }), row({ id: "log-2" })]]);

    const result = await AuditService.listByResource({ resourceType: "project", resourceId: "p1", pageSize: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
  });

  it("非法 cursor:抛 COMMON_VALIDATION_FAILED", async () => {
    mockDbChain([[]]);

    await expect(AuditService.listByResource({ resourceType: "project", resourceId: "p1", pageSize: 2, cursor: "!!not-base64!!" }))
      .rejects
      .toMatchObject({ code: "COMMON_VALIDATION_FAILED" });
  });

  it("wHERE 含 GIN @> 资源引用查询 + 保留策略过滤", async () => {
    mockGetRetentionCutoff.mockReturnValue(new Date("2026-06-01T00:00:00.000Z"));
    const { captured } = mockDbChain([[]]);

    await AuditService.listByResource({ resourceType: "project", resourceId: "p1", pageSize: 2 });

    const { sql } = sqlQuery(captured[0]);
    expect(sql).toContain("@>");
    expect(sql).toContain("occurred_at");
  });
});

describe("AuditService.checkResourceVisibility", () => {
  it("调用应用装配的可见性策略", async () => {
    const policy = vi.fn();
    mockGetAuditResourceVisibilityPolicy.mockReturnValue(policy);
    const actor = { userId: "u1", organizationId: "org-a" };

    await expect(AuditService.checkResourceVisibility(actor, "project", "p1"))
      .resolves
      .toBeUndefined();
    expect(policy).toHaveBeenCalledWith(actor, "p1");
  });

  it("未知资源类型:抛 COMMON_VALIDATION_FAILED", async () => {
    mockGetAuditResourceVisibilityPolicy.mockReturnValue(undefined);

    await expect(AuditService.checkResourceVisibility(
      { userId: "u1", organizationId: "org-a" },
      "widget",
      "w1",
    ))
      .rejects
      .toMatchObject({ code: "COMMON_VALIDATION_FAILED" });
  });
});
