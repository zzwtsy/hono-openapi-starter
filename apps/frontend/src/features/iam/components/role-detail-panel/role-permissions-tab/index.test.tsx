import type { PermissionRef, Role } from "@/api/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolePermissionsTab } from ".";

const { useRolePermissionsMock } = vi.hoisted(() => ({ useRolePermissionsMock: vi.fn() }));

vi.mock("./use-role-permissions", () => ({ useRolePermissions: useRolePermissionsMock }));

const role: Role = {
  id: "role-1",
  name: "客服",
  description: null,
  source: "instance",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const permission: PermissionRef = {
  code: "users.read",
  resourceCode: "users",
  actionCode: "read",
  resourceLabel: "用户",
  label: "查看用户",
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    canRead: true,
    canEdit: true,
    canReadAssignments: true,
    canChange: vi.fn(() => true),
    allPerms: [permission],
    loading: false,
    error: null,
    initial: new Set([permission.code]),
    working: new Set([permission.code]),
    editing: false,
    beginEdit: vi.fn(),
    cancelEdit: vi.fn(),
    search: "",
    setSearch: vi.fn(),
    viewMode: "selected",
    setViewMode: vi.fn(),
    groups: new Map([[permission.resourceCode, [permission]]]),
    toAdd: [],
    toRemove: [],
    hasChanges: false,
    toggle: vi.fn(),
    toggleAllInGroup: vi.fn(),
    retry: vi.fn(),
    submit: vi.fn(),
    submitting: false,
    affectedUsers: [],
    affectedUsersLoading: false,
    affectedUsersError: null,
    loadAffectedUsers: vi.fn(),
    ...overrides,
  };
}

describe("RolePermissionsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("默认只展示已授权限，显式点击后才进入编辑", () => {
    const beginEdit = vi.fn();
    useRolePermissionsMock.mockReturnValue(state({ beginEdit }));
    render(<RolePermissionsTab role={role} isSystemRootUser />);

    expect(screen.getByText("查看用户")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "编辑权限" }));
    expect(beginEdit).toHaveBeenCalledTimes(1);
  });

  it("编辑态展示差异、影响范围并上报未保存状态", async () => {
    const cancelEdit = vi.fn();
    const submit = vi.fn();
    const onDirtyChange = vi.fn();
    useRolePermissionsMock.mockReturnValue(state({
      editing: true,
      initial: new Set(),
      hasChanges: true,
      toAdd: [permission.code],
      cancelEdit,
      submit,
      affectedUsers: [{ userId: "user-1", userName: "张三", email: "zhang@example.com", orgId: "org-1", expiresAt: null }],
    }));
    render(<RolePermissionsTab role={role} isSystemRootUser onDirtyChange={onDirtyChange} />);

    expect(screen.getByRole("checkbox", { name: "全选当前结果 用户" })).toBeInTheDocument();
    expect(screen.getByText("新增 1 · 撤销 0")).toBeInTheDocument();
    expect(screen.getByText("将影响 1 位已授用户")).toBeInTheDocument();
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(true));

    fireEvent.click(screen.getByRole("button", { name: "保存更改" }));
    expect(submit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃更改" }));
    expect(cancelEdit).toHaveBeenCalledTimes(1);
  });
});
