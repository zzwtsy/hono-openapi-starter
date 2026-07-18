import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { okEnvelope, failEnvelope } from "@/test/msw/handlers";

import Apis from "./index";

/**
 * API 层 responded.onSuccess 测试:验证 envelope 剥离、success:false 抛错、401 hard-nav。
 * 这是全应用请求链路的关键节点(alova responded 拦截器),此前零覆盖(B4 D3)。
 * MSW 拦截 fetch,直接 await Method 触发请求,无需渲染组件。
 *
 * 每个用例用不同端点(alova 按 method 缓存,cacheFor 60s,同端点会命中缓存不发请求),
 * 从根上隔离,无需清缓存。
 */
describe("api responded.onSuccess", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("成功响应剥离 envelope 返回 data", async () => {
    server.use(
      http.get("/api/v1/roles", () =>
        okEnvelope([{ id: "r-1", name: "viewer", description: null, source: "instance", createdAt: "t", updatedAt: "t" }]),
      ),
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
});
