import { describe, expect, it, vi } from "vitest";

import { resolveRelationNames, resolveResourceRefNames } from "./relation-resolvers.js";

// mock db 查询,避免单元测试依赖 DB
vi.mock("@/db/client.js", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ name: "华南总部" }]),
      }),
    }),
  },
}));

vi.mock("@/db/schema/index.js", () => ({
  organizations: { id: "id", name: "name" },
  user: { id: "id", name: "name" },
  roles: { id: "id", name: "name" },
}));

describe("relation-resolvers", () => {
  describe("resolveResourceRefNames", () => {
    it("给 ref 加 name(已知 type)", async () => {
      const result = await resolveResourceRefNames([{ type: "org", id: "org_001" }]);
      expect(result).toEqual([{ type: "org", id: "org_001", name: "华南总部" }]);
    });

    it("未知 type 时 name 为 undefined", async () => {
      const result = await resolveResourceRefNames([{ type: "unknown", id: "xxx" }]);
      expect(result).toEqual([{ type: "unknown", id: "xxx", name: undefined }]);
    });

    it("空数组返回空数组", async () => {
      const result = await resolveResourceRefNames([]);
      expect(result).toEqual([]);
    });
  });

  describe("resolveRelationNames", () => {
    it("给对象加 _names 子对象", async () => {
      const result = await resolveRelationNames(
        { orgId: "org_001", name: "张三" },
        ["orgId"],
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

    it("非对象原样返回", async () => {
      expect(await resolveRelationNames("string")).toBe("string");
      expect(await resolveRelationNames(null)).toBe(null);
    });
  });
});
