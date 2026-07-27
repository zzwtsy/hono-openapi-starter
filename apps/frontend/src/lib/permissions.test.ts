import { describe, expect, it } from "vitest";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "./permissions";

describe("hasPermission", () => {
  it("permissions 为 undefined 时返回 false", () => {
    expect(hasPermission(undefined, "organizations.read")).toBe(false);
  });

  it("持有目标权限时返回 true", () => {
    expect(hasPermission(["organizations.read", "users.read"], "users.read")).toBe(true);
  });

  it("未持有目标权限时返回 false", () => {
    expect(hasPermission(["organizations.read"], "users.create")).toBe(false);
  });

  it("权限列表为空时返回 false", () => {
    expect(hasPermission([], "organizations.read")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("permissions 为 undefined 时返回 false", () => {
    expect(hasAnyPermission(undefined, ["organizations.read"])).toBe(false);
  });

  it("required 为空数组时返回 false", () => {
    expect(hasAnyPermission(["users.read"], [])).toBe(false);
  });

  it("持有任一权限时返回 true", () => {
    expect(hasAnyPermission(["organizations.read"], ["users.create", "organizations.read"])).toBe(true);
  });

  it("全部未持有时返回 false", () => {
    expect(hasAnyPermission(["organizations.read"], ["users.create", "users.update"])).toBe(false);
  });

  it("权限列表为空时返回 false", () => {
    expect(hasAnyPermission([], ["organizations.read"])).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("permissions 为 undefined 时返回 false", () => {
    expect(hasAllPermissions(undefined, ["organizations.read"])).toBe(false);
  });

  it("required 为空数组时返回 false", () => {
    expect(hasAllPermissions(["users.read"], [])).toBe(false);
  });

  it("持有全部权限时返回 true", () => {
    expect(hasAllPermissions(["organizations.read", "users.read"], ["organizations.read", "users.read"])).toBe(true);
  });

  it("部分缺失时返回 false", () => {
    expect(hasAllPermissions(["organizations.read"], ["organizations.read", "users.read"])).toBe(false);
  });

  it("全部缺失时返回 false", () => {
    expect(hasAllPermissions(["organizations.read"], ["users.create", "users.update"])).toBe(false);
  });
});
