import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetAuditVisibilityPoliciesForTest,
  getAuditResourceVisibilityPolicy,
  registerAuditActorOrgScopeResolver,
  registerAuditResourceVisibilityPolicy,
  resolveAuditActorOrgScope,
} from "./visibility-policies.js";

beforeEach(() => {
  __resetAuditVisibilityPoliciesForTest();
});

describe("audit visibility policies", () => {
  it("注册并调用资源可见性策略", async () => {
    const policy = vi.fn();
    registerAuditResourceVisibilityPolicy("project", policy);

    const registered = getAuditResourceVisibilityPolicy("project");
    await registered?.({ userId: "u1", organizationId: "org-a" }, "p1");

    expect(policy).toHaveBeenCalledWith({ userId: "u1", organizationId: "org-a" }, "p1");
  });

  it("不同实现不能重复注册同一资源类型", () => {
    registerAuditResourceVisibilityPolicy("project", vi.fn());

    expect(() => registerAuditResourceVisibilityPolicy("project", vi.fn()))
      .toThrow("duplicate audit resource visibility policy: project");
  });

  it("解析操作者可见组织范围", async () => {
    registerAuditActorOrgScopeResolver(async actor => [actor.organizationId, "org-child"]);

    await expect(resolveAuditActorOrgScope({ userId: "u1", organizationId: "org-a" }))
      .resolves
      .toEqual(["org-a", "org-child"]);
  });

  it("未注册组织范围解析器时显式失败", async () => {
    await expect(resolveAuditActorOrgScope({ userId: "u1", organizationId: "org-a" }))
      .rejects
      .toThrow("audit actor organization scope resolver is not registered");
  });
});
