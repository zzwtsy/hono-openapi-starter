import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRoleAssignments } from "./use-role-assignments";

const { assignUserRoleMock, useToastMutationMock, refreshIamMock } = vi.hoisted(() => ({
  assignUserRoleMock: vi.fn(),
  useToastMutationMock: vi.fn(),
  refreshIamMock: vi.fn(),
}));

vi.mock("@/api", () => ({ default: { IAM: { listRolePermissions: vi.fn(), assignUserRole: assignUserRoleMock, deleteUserRole: vi.fn() } } }));
vi.mock("alova/client", () => ({ useWatcher: () => ({ data: [] }) }));
vi.mock("./use-iam-capabilities", () => ({ useIamUserCapabilities: () => ({ canGrantRoleAssignments: true, canRevokeAssignments: true }) }));
vi.mock("@/hooks/use-toast-mutation", () => ({ useToastMutation: useToastMutationMock }));
vi.mock("../lib/iam-actions", () => ({ IAM_ACTIONS: { userRoles: "roles", userPermissions: "effective", authorization: "authorization" }, refreshIam: refreshIamMock }));

function renderAssignments() {
  return renderHook(() => useRoleAssignments({
    userId: "user-1",
    userHomeOrgId: "org-1",
    orgId: "org-1",
    currentUserId: "current-user",
    roles: [{ id: "role-1", name: "管理员", description: null, source: "instance", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    effectiveResult: { effective: [], denied: [] },
  }));
}

describe("useRoleAssignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignUserRoleMock.mockResolvedValue({});
    useToastMutationMock.mockReturnValue({
      busy: false,
      mutate: async (fn: () => Promise<unknown>) => {
        await fn();
        return true;
      },
    });
  });

  it("新增未选日期时省略 expiresAt", async () => {
    const { result } = renderAssignments();
    act(() => {
      result.current.setSelectedRoleId("role-1");
    });
    await act(async () => {
      await result.current.assignRole();
    });

    expect(assignUserRoleMock).toHaveBeenCalledWith({
      pathParams: { userId: "user-1", roleId: "role-1" },
      data: { orgId: "org-1", expiresAt: undefined },
    });
  });

  it("编辑时清除日期显式发送 null", async () => {
    const { result } = renderAssignments();
    act(() => {
      result.current.startEdit({ roleId: "role-1", expiresAt: "2026-12-31T00:00:00.000Z" });
    });
    act(() => {
      result.current.setExpiresAt(null);
    });
    await act(async () => {
      await result.current.assignRole();
    });

    expect(assignUserRoleMock).toHaveBeenCalledWith({
      pathParams: { userId: "user-1", roleId: "role-1" },
      data: { orgId: "org-1", expiresAt: null },
    });
  });
});
