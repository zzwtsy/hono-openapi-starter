import type { UserPermissionsResult } from "@/api/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EffectivePermissionsPanel } from "./effective-permissions-panel";

const { useCanMock } = vi.hoisted(() => ({ useCanMock: vi.fn() }));
vi.mock("@/hooks/use-permissions", () => ({ useCan: useCanMock }));

const roleSource = { type: "role" as const, roleId: "role-1", roleName: "审计员", orgId: "org-1", expiresAt: null };
const directSource = { type: "direct" as const, roleId: null, roleName: null, orgId: "org-1", expiresAt: null };

function renderPanel(data: UserPermissionsResult, permissions = true) {
  useCanMock.mockImplementation(() => permissions);
  return render(
    <EffectivePermissionsPanel
      query={{ data, loading: false, error: null, retry: vi.fn() }}
      getOrgPath={() => "总部"}
      onNavigateRole={vi.fn()}
      onOrgIdChange={vi.fn()}
    />,
  );
}

describe("EffectivePermissionsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("单来源直接展示来源与可用操作", () => {
    renderPanel({ effective: [{ permission: { code: "users.read", label: "查看用户", resourceCode: "users", resourceLabel: "用户", actionCode: "read" }, sources: [roleSource] }], denied: [] });

    expect(screen.getByText(/角色：审计员/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "1 个来源" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看角色" })).toBeVisible();
    expect(screen.getByRole("button", { name: "切换到此组织视角" })).toBeVisible();
  });

  it("多来源使用 Popover 且无读权限时仅显示文本", async () => {
    renderPanel({ effective: [{ permission: { code: "users.read", label: "查看用户", resourceCode: "users", resourceLabel: "用户", actionCode: "read" }, sources: [roleSource, directSource] }], denied: [] }, false);

    fireEvent.click(screen.getByRole("button", { name: "2 个来源" }));
    await waitFor(() => {
      expect(screen.getByText("权限来源")).toBeVisible();
    });
    expect(screen.getByText(/角色：审计员/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "查看角色" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "切换到此组织视角" })).not.toBeInTheDocument();
  });

  it("被拒绝权限同时展示被抑制来源和拒绝组织", () => {
    renderPanel({
      effective: [],
      denied: [{ permission: { code: "users.update", label: "编辑用户", resourceCode: "users", resourceLabel: "用户", actionCode: "update" }, suppressedSources: [roleSource], deniedBy: [{ orgId: "org-1", expiresAt: null }] }],
    });

    expect(screen.getByText("编辑用户")).toHaveClass("line-through");
    expect(screen.getByText("已拒绝")).toBeVisible();
    expect(screen.getAllByText(/总部/).length).toBeGreaterThan(0);
  });
});
