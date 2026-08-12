import { describe, expect, it } from "vitest";

import { allPermissions, assertPermissionCatalog } from "./permissions.js";

describe("application permission catalog", () => {
  it("汇总所有 feature，code 唯一且字段一致", () => {
    expect(allPermissions.length).toBe(27);
    expect(new Set(allPermissions.map(permission => permission.code)).size).toBe(allPermissions.length);
    expect(() => assertPermissionCatalog(allPermissions)).not.toThrow();
  });

  it("拒绝重复 code", () => {
    const duplicate = [allPermissions[0], allPermissions[0]];
    expect(() => assertPermissionCatalog(duplicate)).toThrow("Duplicate permission code");
  });
});
