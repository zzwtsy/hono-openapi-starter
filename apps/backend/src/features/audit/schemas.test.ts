import { describe, expect, it } from "vitest";

import { ListAuditLogsQuerySchema } from "./schemas.js";

describe("ListAuditLogsQuerySchema", () => {
  it("将 CSV 和重复查询参数统一解析为动作数组", () => {
    expect(ListAuditLogsQuerySchema.parse({ actions: "auth.sign-in,iam.role.create" }).actions).toEqual([
      "auth.sign-in",
      "iam.role.create",
    ]);
    expect(ListAuditLogsQuerySchema.parse({ actions: ["auth.sign-in", "iam.role.create"] }).actions).toEqual([
      "auth.sign-in",
      "iam.role.create",
    ]);
    expect(ListAuditLogsQuerySchema.parse({ actions: ["auth.sign-in, iam.role.create", "projects.update"] }).actions).toEqual([
      "auth.sign-in",
      "iam.role.create",
      "projects.update",
    ]);
  });

  it("拒绝空动作和超过 50 个动作", () => {
    expect(ListAuditLogsQuerySchema.safeParse({ actions: "auth.sign-in," }).success).toBe(false);
    expect(ListAuditLogsQuerySchema.safeParse({ actions: Array.from({ length: 51 }, (_, index) => `action-${index}`) }).success).toBe(false);
  });
});
