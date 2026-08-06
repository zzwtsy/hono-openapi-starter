import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAuditResolverRegistryForTest,
  registerAuditRelationResolver,
  registerAuditResourceResolver,
  resolveRelationNames,
  resolveResourceRefNames,
} from "./relation-resolvers.js";

beforeEach(() => {
  __resetAuditResolverRegistryForTest();
  registerAuditResourceResolver("org", async () => "华南总部");
  registerAuditRelationResolver({ field: "orgId", resourceType: "org" });
});

describe("relation-resolvers", () => {
  describe("resolveResourceRefNames", () => {
    it("给 ref 加 name(已注册 type)", async () => {
      const result = await resolveResourceRefNames([{ type: "org", id: "org_001" }]);
      expect(result).toEqual([{ type: "org", id: "org_001", name: "华南总部" }]);
    });

    it("调用方提供 name 时优先保留,不调用 resolver", async () => {
      const resolver = vi.fn(async () => "数据库名称");
      registerAuditResourceResolver("project", resolver);

      const result = await resolveResourceRefNames([{ type: "project", id: "p1", name: "事件名称" }]);

      expect(result).toEqual([{ type: "project", id: "p1", name: "事件名称" }]);
      expect(resolver).not.toHaveBeenCalled();
    });

    it("未注册 type 时保留原始引用,不丢事件", async () => {
      const result = await resolveResourceRefNames([{ type: "unknown", id: "xxx" }]);
      expect(result).toEqual([{ type: "unknown", id: "xxx" }]);
    });

    it("resolver 抛错时回调诊断并保留原始引用", async () => {
      registerAuditResourceResolver("broken", async () => {
        throw new Error("db down");
      });
      const onError = vi.fn();

      const result = await resolveResourceRefNames([{ type: "broken", id: "x1" }], onError);

      expect(result).toEqual([{ type: "broken", id: "x1" }]);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        { kind: "resource", resourceType: "broken", id: "x1" },
      );
    });

    it("空数组返回空数组", async () => {
      await expect(resolveResourceRefNames([])).resolves.toEqual([]);
    });
  });

  describe("resolveRelationNames", () => {
    it("给对象加 _names 子对象", async () => {
      const result = await resolveRelationNames(
        { orgId: "org_001", name: "张三" },
        [{ field: "orgId", resourceType: "org" }],
      );
      expect(result).toEqual({
        orgId: "org_001",
        name: "张三",
        _names: { orgId: "华南总部" },
      });
    });

    it("无 relations 时原样返回", async () => {
      const data = { orgId: "org_001" };
      const result = await resolveRelationNames(data);
      expect(result).toBe(data);
    });

    it("数组和非对象原样返回", async () => {
      const array = [{ orgId: "org_001" }];
      expect(await resolveRelationNames(array, [{ field: "orgId", resourceType: "org" }])).toBe(array);
      expect(await resolveRelationNames("string")).toBe("string");
      expect(await resolveRelationNames(null)).toBe(null);
    });

    it("relation resolver 抛错时回调诊断并保留快照", async () => {
      registerAuditResourceResolver("broken", async () => {
        throw new Error("db down");
      });
      registerAuditRelationResolver({ field: "brokenId", resourceType: "broken" });
      const onError = vi.fn();

      const result = await resolveRelationNames(
        { brokenId: "x1" },
        [{ field: "brokenId", resourceType: "broken" }],
        onError,
      );

      expect(result).toEqual({ brokenId: "x1", _names: {} });
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        { kind: "relation", resourceType: "broken", id: "x1", field: "brokenId" },
      );
    });
  });
});
