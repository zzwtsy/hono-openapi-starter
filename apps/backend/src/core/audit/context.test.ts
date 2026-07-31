import { describe, expect, it } from "vitest";

import { getAuditContext, runWithAuditContext, setAuditContext } from "./context.js";

describe("audit context (ALS)", () => {
  it("无 ALS 上下文时 getAuditContext 返回 undefined", () => {
    expect(getAuditContext()).toBeUndefined();
  });

  it("无 ALS 上下文时 setAuditContext 是 no-op", () => {
    expect(() => setAuditContext({ actorUserId: "u1" })).not.toThrow();
    expect(getAuditContext()).toBeUndefined();
  });

  it("runWithAuditContext 内 getAuditContext 返回 store", async () => {
    await runWithAuditContext(
      {
        actorUserId: null,
        actorOrgId: null,
        actorRoleSnapshot: null,
        actorNameSnapshot: null,
        ipAddress: "1.2.3.4",
        userAgent: "test",
        requestId: "req-1",
      },
      async () => {
        const ctx = getAuditContext();
        expect(ctx).toBeDefined();
        expect(ctx?.ipAddress).toBe("1.2.3.4");
        expect(ctx?.requestId).toBe("req-1");
      },
    );
  });

  it("setAuditContext 增量更新 store", async () => {
    await runWithAuditContext(
      {
        actorUserId: null,
        actorOrgId: null,
        actorRoleSnapshot: null,
        actorNameSnapshot: null,
        ipAddress: undefined,
        userAgent: undefined,
        requestId: "req-1",
      },
      async () => {
        setAuditContext({ actorUserId: "u1", actorOrgId: "o1" });
        const ctx = getAuditContext();
        expect(ctx?.actorUserId).toBe("u1");
        expect(ctx?.actorOrgId).toBe("o1");
        expect(ctx?.requestId).toBe("req-1"); // 原有值保留
      },
    );
  });
});
