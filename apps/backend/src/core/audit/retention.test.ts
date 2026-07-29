import { describe, expect, it, vi } from "vitest";

import { getRetentionCutoff } from "./retention.js";

// mock env 避免依赖真实环境变量
vi.mock("../../env.js", () => ({
  default: {
    AUDIT_LOG_RETENTION_DAYS: 90,
  },
}));

vi.mock("@/db/client.js", () => ({
  db: { delete: vi.fn() },
}));

vi.mock("@/db/schema/index.js", () => ({
  auditLogs: { occurredAt: "occurred_at" },
}));

describe("audit retention", () => {
  it("getRetentionCutoff 返回 90 天前的时间", () => {
    const cutoff = getRetentionCutoff();
    expect(cutoff).not.toBeNull();
    const expected = Date.now() - 90 * 24 * 60 * 60 * 1000;
    expect(cutoff?.getTime()).toBeCloseTo(expected, -1000);
  });

  it("retention 为 0 时返回 null(永久保留)", async () => {
    // 重新 mock env
    vi.resetModules();
    vi.doMock("../../env.js", () => ({
      default: { AUDIT_LOG_RETENTION_DAYS: 0 },
    }));
    const { getRetentionCutoff: getCutoff } = await import("./retention.js");
    expect(getCutoff()).toBeNull();
  });
});
