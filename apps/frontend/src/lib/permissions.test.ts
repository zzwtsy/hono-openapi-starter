import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("hasPermission", () => {
  it("permissions 为 undefined 时返回 false", () => {
    expect(hasPermission(undefined, "iam.read")).toBe(false);
  });

  it("持有目标权限时返回 true", () => {
    expect(hasPermission(["iam.read", "users.read"], "users.read")).toBe(true);
  });

  it("未持有目标权限时返回 false", () => {
    expect(hasPermission(["iam.read"], "users.create")).toBe(false);
  });

  it("权限列表为空时返回 false", () => {
    expect(hasPermission([], "iam.read")).toBe(false);
  });
});
