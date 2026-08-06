import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/index.js";
import { AuditService } from "@/features/audit/service.js";
import { resetDb } from "../../helpers/db.js";

beforeEach(async () => {
  await resetDb();
});

describe("audit_logs schema and queries", () => {
  it("migration 保留 occurred/recorded/schema_version 并移除旧字段", async () => {
    const rows = await db.execute<{ column_name: string }>(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'audit_logs'
    `);
    const columns = rows.map(row => row.column_name);

    expect(columns).toEqual(expect.arrayContaining([
      "occurred_at",
      "recorded_at",
      "schema_version",
    ]));
    expect(columns).not.toContain("created_at");
    expect(columns).not.toContain("actor_role_snapshot");
  });

  it("真实 PostgreSQL GIN @> 查询按 occurredAt 排序并返回时间线最小 DTO", async () => {
    const now = new Date();
    await db.insert(auditLogs).values([
      {
        id: "audit-old",
        actorUserId: "u1",
        actorOrgId: "org-a",
        actorNameSnapshot: "张三",
        action: "projects.update",
        resourceRefs: [{ type: "project", id: "p1", name: "项目A" }],
        beforeState: { name: "旧名" },
        afterState: { name: "中间名" },
        changedFields: ["name"],
        status: "success",
        occurredAt: new Date(now.getTime() - 2_000),
      },
      {
        id: "audit-new",
        actorUserId: "u1",
        actorOrgId: "org-a",
        actorNameSnapshot: "张三",
        action: "projects.update",
        resourceRefs: [{ type: "project", id: "p1", name: "项目A" }],
        beforeState: { name: "中间名" },
        afterState: { name: "新名" },
        changedFields: ["name"],
        status: "success",
        occurredAt: new Date(now.getTime() - 1_000),
      },
    ]);

    const result = await AuditService.listByResource({
      resourceType: "project",
      resourceId: "p1",
      pageSize: 10,
    });

    expect(result.items.map(item => item.id)).toEqual(["audit-new", "audit-old"]);
    expect(result.items[0]).toMatchObject({
      action: "projects.update",
      actionLabel: "projects.update",
      actorName: "张三",
      resourceRefs: [{ type: "project", id: "p1", name: "项目A" }],
    });
    expect(result.items[0]).not.toHaveProperty("ipAddress");
    expect(result.items[0]).not.toHaveProperty("userAgent");
    expect(result.items[0]).not.toHaveProperty("requestId");
  });

  it("recordedAt 和 schemaVersion 使用数据库默认值,全局 DTO 返回 ISO 时间", async () => {
    const occurredAt = new Date(Date.now() - 1_000);
    await db.insert(auditLogs).values({
      id: "audit-detail",
      actorUserId: "u1",
      actorOrgId: "org-a",
      actorNameSnapshot: "张三",
      action: "projects.update",
      resourceRefs: [{ type: "project", id: "p1" }],
      status: "success",
      occurredAt,
    });

    const [row] = await db.select().from(auditLogs);
    expect(row?.recordedAt).toBeInstanceOf(Date);
    expect(row?.schemaVersion).toBe(1);

    const result = await AuditService.list({
      page: 1,
      pageSize: 10,
      actorOrgIds: ["org-a"],
    });
    expect(result.items[0]).toMatchObject({
      id: "audit-detail",
      occurredAt: occurredAt.toISOString(),
    });
    expect(result.items[0]?.recordedAt).toEqual(expect.any(String));
  });

  it("status 数据库约束拒绝非法值", async () => {
    await expect(db.insert(auditLogs).values({
      id: "audit-invalid-status",
      action: "projects.update",
      resourceRefs: [],
      status: "invalid" as "success",
      occurredAt: new Date(),
    })).rejects.toThrow();
  });
});
