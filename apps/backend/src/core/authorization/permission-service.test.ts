import { beforeEach, describe, expect, it, vi } from "vitest";

import { runWithPermissionCache } from "./permission-cache.js";
import { PermissionService } from "./permission-service.js";

const { mockCheckPermission } = vi.hoisted(() => ({ mockCheckPermission: vi.fn() }));
vi.mock("./check.js", () => ({ checkPermission: mockCheckPermission }));

beforeEach(() => {
  mockCheckPermission.mockReset();
});

describe("PermissionService.check", () => {
  it("返回 checkPermission 结果", async () => {
    mockCheckPermission.mockResolvedValue(false);

    const allowed = await PermissionService.check("u-1", "users.read", "org-1");

    expect(allowed).toBe(false);
    expect(mockCheckPermission).toHaveBeenCalledWith("u-1", "users.read", "org-1");
  });

  it("无 ALS 时不缓存,每次调 checkPermission", async () => {
    mockCheckPermission.mockResolvedValue(true);

    await PermissionService.check("u-1", "users.read", "org-1");
    await PermissionService.check("u-1", "users.read", "org-1");

    expect(mockCheckPermission).toHaveBeenCalledTimes(2);
  });

  it("有 ALS 时同 (userId, permission, orgId) 只调一次 checkPermission", async () => {
    mockCheckPermission.mockResolvedValue(true);

    await runWithPermissionCache(async () => {
      await PermissionService.check("u-1", "users.read", "org-1");
      await PermissionService.check("u-1", "users.read", "org-1");
    });

    expect(mockCheckPermission).toHaveBeenCalledTimes(1);
  });

  it("有 ALS 时不同 permission 各调一次", async () => {
    mockCheckPermission.mockResolvedValue(true);

    await runWithPermissionCache(async () => {
      await PermissionService.check("u-1", "users.read", "org-1");
      await PermissionService.check("u-1", "users.write", "org-1");
    });

    expect(mockCheckPermission).toHaveBeenCalledTimes(2);
  });
});
