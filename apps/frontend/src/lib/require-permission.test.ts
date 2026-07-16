import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { requirePermission } from "./require-permission";

describe("requirePermission", () => {
  it("持有权限时不抛错", () => {
    expect(() => {
      requirePermission(["users.read", "organizations.manage"], "users.read");
    }).not.toThrow();
  });

  it("缺少权限时抛 redirect 到 /403", () => {
    try {
      requirePermission(["iam.read"], "users.read");
      expect.unreachable("应抛出 redirect");
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      if (isRedirect(err)) {
        expect(err.options.to).toBe("/403");
      }
    }
  });

  it("permissions 为 undefined 时抛 redirect 到 /403", () => {
    try {
      requirePermission(undefined, "users.read");
      expect.unreachable("应抛出 redirect");
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      if (isRedirect(err)) {
        expect(err.options.to).toBe("/403");
      }
    }
  });
});
