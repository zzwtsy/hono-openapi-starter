import type { ComponentProps, ReactNode } from "react";
import type { UserSummary } from "@/api/globals";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDetailPanel } from ".";

const { useIamUserCapabilitiesMock, useTargetCapabilitiesMock } = vi.hoisted(() => ({
  useIamUserCapabilitiesMock: vi.fn(),
  useTargetCapabilitiesMock: vi.fn(),
}));

vi.mock("../../hooks/use-iam-capabilities", () => ({
  useIamUserCapabilities: useIamUserCapabilitiesMock,
  useTargetCapabilities: useTargetCapabilitiesMock,
}));

vi.mock("@/hooks/use-toast-mutation", () => ({
  useToastMutation: () => ({ mutate: vi.fn() }),
}));

vi.mock("../iam-detail-surface", () => ({
  IamDetailSurface: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("./user-access-panel", () => ({
  UserAccessPanel: () => <div>访问权限内容</div>,
}));

vi.mock("./user-dialogs", () => ({
  UserDialogs: () => null,
}));

vi.mock("./user-info-tab", () => ({
  UserInfoTab: () => <div>概览内容</div>,
}));

const user: UserSummary = {
  id: "user-1",
  name: "张三",
  email: "user@example.com",
  orgId: "org-1",
  disabled: false,
  createdAt: "2026-08-01T00:00:00.000Z",
};

function renderPanel(overrides: Partial<ComponentProps<typeof UserDetailPanel>> = {}) {
  return render(
    <UserDetailPanel
      mode="card"
      user={user}
      orgId="org-1"
      onOrgIdChange={vi.fn()}
      orgOptions={[{ label: "总部", value: "org-1" }]}
      getOrgPath={() => "总部"}
      currentUserId="current-user"
      roles={[]}
      tab="overview"
      accessView="config"
      onTabChange={vi.fn()}
      onAccessViewChange={vi.fn()}
      onNavigateRole={vi.fn()}
      auditTabContent={<div>操作记录内容</div>}
      {...overrides}
    />,
  );
}

describe("UserDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTargetCapabilitiesMock.mockReturnValue({ data: { permissionCodes: [] } });
    useIamUserCapabilitiesMock.mockReturnValue({ canReadAssignments: true });
  });

  it("将用户详情收敛为概览、访问权限和操作记录三个入口", () => {
    renderPanel();

    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["概览", "访问权限", "操作记录"]);
    expect(screen.queryByRole("tab", { name: "角色授权" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "直接权限" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "有效权限" })).not.toBeInTheDocument();
  });

  it("访问权限 Tab 集中展示授权上下文", () => {
    renderPanel({ tab: "access" });

    expect(screen.getByText("访问权限内容")).toBeVisible();
    expect(screen.queryByText("概览内容")).not.toBeInTheDocument();
  });

  it("无授权读取权限时隐藏访问入口，并将旧的访问状态回退到概览", () => {
    useIamUserCapabilitiesMock.mockReturnValue({ canReadAssignments: false });
    renderPanel({ tab: "access" });

    expect(screen.queryByRole("tab", { name: "访问权限" })).not.toBeInTheDocument();
    expect(screen.getByText("概览内容")).toBeVisible();
  });
});
