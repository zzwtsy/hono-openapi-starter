import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { failEnvelope, okEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

import Apis from "./index";
import "@/test/msw/setup";

/**
 * API 层 responded.onSuccess 测试:验证 envelope 剥离、success:false 抛错、401 hard-nav。
 * 这是全应用请求链路的关键节点(alova responded 拦截器),此前零覆盖(B4 D3)。
 * MSW 拦截 fetch,直接 await Method 触发请求,无需渲染组件。
 *
 * 每个用例用不同端点(alova 按 method 缓存,cacheFor 60s,同端点会命中缓存不发请求),
 * 从根上隔离,无需清缓存。
 */
describe("api responded.onSuccess", () => {
  it("成功响应剥离 envelope 返回 data", async () => {
    server.use(
      http.get("/api/v1/roles", () =>
        okEnvelope([{ id: "r-1", name: "viewer", description: null, source: "instance", createdAt: "t", updatedAt: "t" }])),
    );

    const data = await Apis.IAM.listRoles();

    expect(data).toEqual([
      { id: "r-1", name: "viewer", description: null, source: "instance", createdAt: "t", updatedAt: "t" },
    ]);
  });

  it("success:false 抛错且 message 取自 envelope", async () => {
    server.use(
      http.get("/api/v1/permissions", () => failEnvelope("权限不足", "COMMON_FORBIDDEN")),
    );

    await expect(Apis.IAM.listPermissions()).rejects.toThrow("权限不足");
  });

  it("401 hard-nav 到 /login 并抛错", async () => {
    server.use(
      http.get("/api/v1/organizations", () => new HttpResponse(null, { status: 401 })),
    );
    const assignSpy = vi.spyOn(window.location, "assign");

    await expect(Apis.IAM.listOrganizations()).rejects.toThrow("登录已过期");

    expect(assignSpy).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?redirect=/));
  });

  it("审计时间线响应保留 actionLabel 且不暴露请求级字段", async () => {
    server.use(
      http.get("/api/v1/audit-logs/by-resource", () =>
        okEnvelope({
          items: [{
            id: "audit-1",
            actorUserId: "user-1",
            actorName: "张三",
            action: "projects.update",
            resourceRefs: [{ type: "project", id: "project-1", name: "项目 A" }],
            beforeState: { name: "旧名" },
            afterState: { name: "新名" },
            changedFields: ["name"],
            status: "success",
            errorCode: null,
            occurredAt: "2026-07-10T12:00:00.000Z",
            actionLabel: "修改项目",
          }],
          meta: { nextCursor: null, hasMore: false },
        })),
    );

    const data = await Apis.Audit.listAuditLogsByResource({
      params: { resourceType: "project", resourceId: "project-1" },
    });

    expect(data.items[0]?.actionLabel).toBe("修改项目");
    expect(data.items[0]).not.toHaveProperty("ipAddress");
    expect(data.items[0]).not.toHaveProperty("requestId");
    expect(data.items[0]).not.toHaveProperty("metadata");
  });

  it("审计列表按 OpenAPI CSV 形式序列化多个 actions 查询参数", async () => {
    let receivedActions: string | null = null;
    server.use(
      http.get("/api/v1/audit-logs", ({ request }) => {
        receivedActions = new URL(request.url).searchParams.get("actions");
        return okEnvelope({
          items: [],
          meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
        });
      }),
    );

    await Apis.Audit.listAuditLogs({
      params: {
        page: 1,
        pageSize: 25,
        actions: ["auth.sign-in", "iam.role.create"],
      },
    });

    expect(receivedActions).toBe("auth.sign-in,iam.role.create");
  });
});
