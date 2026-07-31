import { describe, expect, it } from "vitest";

import { resolveSignInEvent, signOutAuditUser } from "./auth-audit-events.js";

describe("resolveSignInEvent", () => {
  it("成功:从 newSession.user 取用户,status success,无 errorCode", () => {
    const event = resolveSignInEvent({
      context: {
        newSession: { user: { id: "u1", orgId: "org-1", name: "张三" } },
      },
    });
    expect(event).toEqual({ user: { id: "u1", orgId: "org-1" }, status: "success", errorCode: undefined });
  });

  it("失败:returned 是 APIError 形状(name=APIError),记 failure + errorCode,无 user", () => {
    const event = resolveSignInEvent({
      context: {
        returned: { name: "APIError", body: { code: "INVALID_EMAIL_OR_PASSWORD" } },
        newSession: null,
      },
    });
    expect(event).toEqual({ user: null, status: "failure", errorCode: "INVALID_EMAIL_OR_PASSWORD" });
  });

  it("成功但 newSession 缺失:user null,status success(极端边界)", () => {
    const event = resolveSignInEvent({ context: {} });
    expect(event.user).toBeNull();
    expect(event.status).toBe("success");
    expect(event.errorCode).toBeUndefined();
  });

  it("user 无 orgId 或 orgId 非字符串:归一为 null", () => {
    expect(resolveSignInEvent({ context: { newSession: { user: { id: "u1" } } } }).user)
      .toEqual({ id: "u1", orgId: null });
    expect(resolveSignInEvent({ context: { newSession: { user: { id: "u1", orgId: 42 } } } }).user)
      .toEqual({ id: "u1", orgId: null });
  });

  it("user 缺 id 或非对象:user null", () => {
    expect(resolveSignInEvent({ context: { newSession: { user: { orgId: "org-1" } } } }).user).toBeNull();
    expect(resolveSignInEvent({ context: { newSession: { user: "not-object" } } }).user).toBeNull();
  });
});

describe("signOutAuditUser", () => {
  it("session 存在:提取用户 id/orgId", () => {
    expect(signOutAuditUser({ user: { id: "u1", orgId: "org-1" } })).toEqual({ id: "u1", orgId: "org-1" });
  });

  it("session 为 null(未登录):返回 null,不记", () => {
    expect(signOutAuditUser(null)).toBeNull();
  });

  it("session 无 user:返回 null", () => {
    expect(signOutAuditUser({ user: undefined })).toBeNull();
  });
});
