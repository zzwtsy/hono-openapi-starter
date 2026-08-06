import type { Context } from "hono";
import type { AuditConfig } from "./types.js";
import { Hono } from "hono";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/app-error.js";
import { defineAuditAction } from "./action.js";
import { audit } from "./middleware.js";

// middleware 依赖 logger(模块级 import env,避免 env 校验)与 writeAudit(避免 DB 依赖)。
const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }));

vi.mock("../logger/index.js", () => ({
  logger: {
    withError: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
    error: mockLoggerError,
  },
}));

vi.mock("./write-audit.js", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

const { writeAudit } = await import("./write-audit.js");

type TestHandler = (c: Context) => Response;

function testAction(action: string, label = action) {
  return defineAuditAction(action, label);
}

function buildApp(config: AuditConfig, handler: TestHandler) {
  const app = new Hono();
  app.use("/test/*", audit(config));
  app.get("/test/:id", handler);
  app.post("/test/:id", handler);
  return app;
}

/** 模拟业务 handler 成功响应(envelope 结构,after 默认从 body.data 读)。 */
function okHandler(c: Context) {
  return c.json({ success: true, code: "COMMON_OK", message: "ok", data: { id: "p1", name: "项目A" }, error: null });
}

function lastAuditCall() {
  const calls = vi.mocked(writeAudit).mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe("audit() 中间件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("定义期校验:action/label 必填,resourceType 与 resourceRefs 恰好一个,resourceType 需配 resourceId", () => {
    expect(() => audit({ action: testAction(""), resourceType: "user", resourceId: () => "u1" })).toThrow();
    expect(() => audit({ action: testAction("a.b", ""), resourceType: "user", resourceId: () => "u1" })).toThrow();
    // 两者都不配
    expect(() => audit({ action: testAction("a.b", "x") } as unknown as AuditConfig)).toThrow();
    // 两者都配
    expect(() => audit({
      action: testAction("a.b", "x"),
      resourceType: "user",
      resourceId: () => "u1",
      resourceRefs: () => [{ type: "user", id: "u1" }],
    } as unknown as AuditConfig)).toThrow();
    // resourceType 配了但 resourceId 缺失
    expect(() => audit({ action: testAction("a.b", "x"), resourceType: "user" } as unknown as AuditConfig)).toThrow();
    // 合法配置不抛
    expect(() => audit({ action: testAction("a.b", "x"), resourceType: "user", resourceId: () => "u1" })).not.toThrow();
    expect(() => audit({ action: testAction("a.b", "x"), resourceRefs: () => [] })).not.toThrow();
  });

  it("成功路径:before/after/refs 组装正确", async () => {
    const app = buildApp(
      {
        action: testAction("projects.update", "修改项目"),
        resourceType: "project",
        resourceId: c => c.req.param("id") ?? "",
        before: async () => ({ id: "p1", name: "旧名" }),
        after: async () => ({ id: "p1", name: "项目A" }),
      },
      okHandler,
    );

    const res = await app.request("/test/p1");

    expect(res.status).toBe(200);
    expect(lastAuditCall()).toMatchObject({
      action: "projects.update",
      status: "success",
      beforeState: { id: "p1", name: "旧名" },
      afterState: { id: "p1", name: "项目A" },
      resourceRefs: [{ type: "project", id: "p1" }],
    });
  });

  it("handler 抛 AppError:记 failure + 原错误码,不被解析异常覆盖", async () => {
    const app = buildApp(
      {
        action: testAction("projects.update", "修改项目"),
        resourceType: "project",
        resourceId: c => c.req.param("id") ?? "",
      },
      () => {
        throw new AppError("ROLE_NOT_FOUND");
      },
    );

    const res = await app.request("/test/p1");

    expect(res.status).toBe(500); // Hono 默认 errorHandler 返回 500;重点是错误码从 c.error 提取,未被覆盖
    expect(lastAuditCall()).toMatchObject({
      action: "projects.update",
      status: "failure",
      errorCode: "ROLE_NOT_FOUND",
    });
  });

  it("resourceId 解析失败:降级为空 refs 继续记,不覆盖成功响应(回归:旧实现抛 TypeError 覆盖业务)", async () => {
    const app = buildApp(
      {
        action: testAction("projects.create", "创建项目"),
        resourceType: "project",
        // 模拟 create 路由失败路径:c.res 未设置时 c.res.clone().json() 抛
        resourceId: async () => {
          throw new TypeError("body is null");
        },
      },
      okHandler,
    );

    const res = await app.request("/test/p1");

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    expect(lastAuditCall()).toMatchObject({
      action: "projects.create",
      status: "success",
      resourceRefs: [],
    });
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it("handler 抛错且 resourceId 也抛(create 失败场景):failure 审计不丢,原错误码保留", async () => {
    const app = buildApp(
      {
        action: testAction("projects.create", "创建项目"),
        resourceType: "project",
        resourceId: async () => {
          throw new TypeError("body is null");
        },
      },
      () => {
        throw new AppError("PROJECT_NAME_CONFLICT");
      },
    );

    const res = await app.request("/test/p1");

    expect(res.status).toBe(500); // Hono 默认 errorHandler
    expect(lastAuditCall()).toMatchObject({
      action: "projects.create",
      status: "failure",
      errorCode: "PROJECT_NAME_CONFLICT",
      resourceRefs: [],
    });
  });

  it("before 查询失败不阻塞业务,审计照记(before 为空)", async () => {
    const app = buildApp(
      {
        action: testAction("projects.update", "修改项目"),
        resourceType: "project",
        resourceId: c => c.req.param("id") ?? "",
        before: async () => {
          throw new Error("db down");
        },
      },
      okHandler,
    );

    const res = await app.request("/test/p1");

    expect(res.status).toBe(200);
    expect(lastAuditCall()?.beforeState).toBeUndefined();
  });

  it("metadata 函数形式:按请求解析并写入记录", async () => {
    const app = buildApp(
      {
        action: testAction("iam.user.transfer_org", "用户调岗"),
        resourceType: "user",
        resourceId: c => c.req.param("id")!,
        metadata: async (c) => {
          const body = await c.req.json<{ clearAllGrants?: boolean }>();
          return { clearAllGrants: body.clearAllGrants ?? false };
        },
      },
      okHandler,
    );

    const res = await app.request("/test/u1", {
      method: "POST",
      body: JSON.stringify({ clearAllGrants: true }),
    });

    expect(res.status).toBe(200);
    expect(lastAuditCall()?.metadata).toEqual({ clearAllGrants: true });
  });

  it("metadata 函数抛错:降级 undefined,审计照记", async () => {
    const app = buildApp(
      {
        action: testAction("iam.user.transfer_org", "用户调岗"),
        resourceType: "user",
        resourceId: c => c.req.param("id")!,
        metadata: async () => {
          throw new Error("body unreadable");
        },
      },
      okHandler,
    );

    const res = await app.request("/test/u1");

    expect(res.status).toBe(200);
    expect(lastAuditCall()?.metadata).toBeUndefined();
  });

  it("resourceRefs 配置优先于 resourceType(resourceType 被忽略)", async () => {
    const app = buildApp(
      {
        action: testAction("iam.assignment.grant_role", "授用户角色"),
        resourceRefs: c => [
          { type: "user", id: c.req.param("id") ?? "" },
          { type: "role", id: "role-admin" },
        ],
      },
      okHandler,
    );

    const res = await app.request("/test/u1");

    expect(res.status).toBe(200);
    expect(lastAuditCall()?.resourceRefs).toEqual([
      { type: "user", id: "u1" },
      { type: "role", id: "role-admin" },
    ]);
  });
});
