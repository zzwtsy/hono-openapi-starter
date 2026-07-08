import type { PermissionChecker } from "./permission-checker.js";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runWithPermissionCache } from "./permission-cache.js";
import { setPermissionChecker } from "./permission-checker.js";
import { PermissionService } from "./permission-service.js";

// mock holder 装配的 PermissionChecker 实现(替代原 vi.mock check.js/list-effective.js)
const { mockCheck, mockListEffective } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockListEffective: vi.fn(),
}));

const mockChecker: PermissionChecker = {
  check: mockCheck,
  listEffectivePermissions: mockListEffective,
};

beforeEach(() => {
  mockCheck.mockReset();
  mockListEffective.mockReset();
  setPermissionChecker(mockChecker);
});

describe("PermissionService.check", () => {
  it("返回 holder 实现的结果", async () => {
    mockCheck.mockResolvedValue(false);

    const allowed = await PermissionService.check("u-1", "users.read", "org-1");

    expect(allowed).toBe(false);
    expect(mockCheck).toHaveBeenCalledWith("u-1", "users.read", "org-1");
  });

  it("无 ALS 时不缓存,每次调 holder", async () => {
    mockCheck.mockResolvedValue(true);

    await PermissionService.check("u-1", "users.read", "org-1");
    await PermissionService.check("u-1", "users.read", "org-1");

    expect(mockCheck).toHaveBeenCalledTimes(2);
  });

  it("有 ALS 时同 key 只调一次 holder", async () => {
    mockCheck.mockResolvedValue(true);

    await runWithPermissionCache(async () => {
      await PermissionService.check("u-1", "users.read", "org-1");
      await PermissionService.check("u-1", "users.read", "org-1");
    });

    expect(mockCheck).toHaveBeenCalledTimes(1);
  });

  it("有 ALS 时不同 permission 各调一次", async () => {
    mockCheck.mockResolvedValue(true);

    await runWithPermissionCache(async () => {
      await PermissionService.check("u-1", "users.read", "org-1");
      await PermissionService.check("u-1", "users.write", "org-1");
    });

    expect(mockCheck).toHaveBeenCalledTimes(2);
  });
});

describe("PermissionService.listEffectivePermissions", () => {
  it("返回 holder 实现的结果", async () => {
    mockListEffective.mockResolvedValue(["projects.read"]);

    const perms = await PermissionService.listEffectivePermissions("u-1", "org-1");

    expect(perms).toEqual(["projects.read"]);
    expect(mockListEffective).toHaveBeenCalledWith("u-1", "org-1");
  });

  it("有 ALS 时同 key 只调一次 holder", async () => {
    mockListEffective.mockResolvedValue(["projects.read"]);

    await runWithPermissionCache(async () => {
      await PermissionService.listEffectivePermissions("u-1", "org-1");
      await PermissionService.listEffectivePermissions("u-1", "org-1");
    });

    expect(mockListEffective).toHaveBeenCalledTimes(1);
  });
});
