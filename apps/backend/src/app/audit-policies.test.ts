import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAuditResourceVisibilityPolicy,
  resolveAuditActorOrgScope,
} from "@/core/audit/visibility-policies.js";
import { registerAuditPolicies } from "./audit-policies.js";

const {
  mockGetManagedSubtree,
  mockPermissionCheck,
  mockProjectGetById,
  mockSelect,
} = vi.hoisted(() => ({
  mockGetManagedSubtree: vi.fn(),
  mockPermissionCheck: vi.fn(),
  mockProjectGetById: vi.fn(),
  mockSelect: vi.fn(),
}));

vi.mock("@/core/authorization/index.js", () => ({
  PermissionService: { check: mockPermissionCheck },
}));
vi.mock("@/db/client.js", () => ({ db: { select: mockSelect } }));
vi.mock("@/features/iam/index.js", () => ({
  getManagedSubtree: mockGetManagedSubtree,
}));
vi.mock("@/features/projects/index.js", () => ({
  ProjectService: { getById: mockProjectGetById },
}));

function mockSelectedRows(rows: unknown[]) {
  const chain = {
    from: () => chain,
    where: async () => rows,
  };
  mockSelect.mockReturnValue(chain);
}

const actor = { userId: "u1", organizationId: "org-a" };

beforeAll(() => {
  registerAuditPolicies();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPermissionCheck.mockResolvedValue(true);
});

describe("registerAuditPolicies", () => {
  it("全局列表范围复用 IAM 管理子树", async () => {
    mockGetManagedSubtree.mockResolvedValue(["org-a", "org-b"]);

    await expect(resolveAuditActorOrgScope(actor)).resolves.toEqual(["org-a", "org-b"]);
    expect(mockGetManagedSubtree).toHaveBeenCalledWith("org-a");
  });

  it("project 策略先校验权限，再复用项目组织可见性", async () => {
    const policy = getAuditResourceVisibilityPolicy("project");

    await expect(policy?.(actor, "p1")).resolves.toBeUndefined();
    expect(mockPermissionCheck).toHaveBeenCalledWith("u1", "projects.read", "org-a");
    expect(mockProjectGetById).toHaveBeenCalledWith("p1", "org-a");
  });

  it("project 无读取权限时不查询项目", async () => {
    mockPermissionCheck.mockResolvedValue(false);
    const policy = getAuditResourceVisibilityPolicy("project");

    await expect(policy?.(actor, "p1")).rejects.toMatchObject({ code: "COMMON_FORBIDDEN" });
    expect(mockProjectGetById).not.toHaveBeenCalled();
  });

  it("user 仅允许查看管理子树内用户", async () => {
    mockGetManagedSubtree.mockResolvedValue(["org-a", "org-b"]);
    mockSelectedRows([{ orgId: "org-b" }]);
    const policy = getAuditResourceVisibilityPolicy("user");

    await expect(policy?.(actor, "u2")).resolves.toBeUndefined();

    mockSelectedRows([{ orgId: "org-x" }]);
    await expect(policy?.(actor, "u3")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it.for([
    ["role", "roles.read"],
    ["org", "organizations.read"],
    ["setting", "settings.read"],
  ] as const)("%s 策略校验对应读取权限", async ([resourceType, permission]) => {
    const policy = getAuditResourceVisibilityPolicy(resourceType);

    await expect(policy?.(actor, "resource-1")).resolves.toBeUndefined();
    expect(mockPermissionCheck).toHaveBeenCalledWith("u1", permission, "org-a");
  });
});
