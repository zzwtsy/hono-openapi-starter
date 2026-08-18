import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserAccessPanel } from "./user-access-panel";

const { useUserAccessDataMock, useIamUserCapabilitiesMock } = vi.hoisted(() => ({
  useUserAccessDataMock: vi.fn(),
  useIamUserCapabilitiesMock: vi.fn(),
}));

vi.mock("../../hooks/use-user-access-data", () => ({ useUserAccessData: useUserAccessDataMock }));
vi.mock("../../hooks/use-iam-capabilities", () => ({ useIamUserCapabilities: useIamUserCapabilitiesMock }));
vi.mock("./role-assignments-tab", () => ({ RoleAssignmentsTab: () => <div>角色配置内容</div> }));
vi.mock("./direct-permissions-tab", () => ({ DirectPermissionsTab: () => <div>例外配置内容</div> }));
vi.mock("./effective-permissions-panel", () => ({ EffectivePermissionsPanel: () => <div>生效结果内容</div> }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, id }: { children: ReactNode; id: string }) => <button id={id}>{children}</button>,
  SelectValue: () => <span>总部</span>,
}));

const query = <T,>(data: T | undefined, error: unknown = null) => ({ data, loading: false, error, retry: vi.fn() });

describe("UserAccessPanel", () => {
  beforeEach(() => {
    useIamUserCapabilitiesMock.mockReturnValue({ canReadAssignments: true });
    useUserAccessDataMock.mockReturnValue({
      roles: query([{ roleId: "role-1" }, { roleId: "role-2" }]),
      directPermissions: query([{ permission: { code: "users.read" } }]),
      effectivePermissions: query({ effective: [{ permission: { code: "users.read" } }, { permission: { code: "users.update" } }], denied: [] }),
    });
  });

  it("默认展示授权配置与三项摘要", () => {
    render(<UserAccessPanel userId="user-1" userName="张三" userHomeOrgId="org-1" orgId="org-1" orgOptions={[{ label: "总部", value: "org-1" }]} currentUserId="current" roles={[]} view="config" getOrgPath={() => "总部"} onViewChange={vi.fn()} onOrgIdChange={vi.fn()} onNavigateRole={vi.fn()} />);

    expect(screen.getByText("授权操作作用于此组织。")).toBeVisible();
    expect(screen.getByText("角色配置内容")).toBeVisible();
    expect(screen.getByText("例外配置内容")).toBeVisible();
    expect(screen.getAllByText("2 项")).toHaveLength(2);
    expect(screen.getByText("1 项")).toBeVisible();
  });

  it("切换内部视图时只上报 URL 状态变更", () => {
    const onViewChange = vi.fn();
    render(<UserAccessPanel userId="user-1" userName="张三" userHomeOrgId="org-1" orgId="org-1" orgOptions={[]} currentUserId="current" roles={[]} view="config" getOrgPath={() => "总部"} onViewChange={onViewChange} onOrgIdChange={vi.fn()} onNavigateRole={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "生效结果" }));
    expect(onViewChange).toHaveBeenCalledWith("effective");
  });

  it("单个摘要失败时不影响其他摘要", () => {
    useUserAccessDataMock.mockReturnValue({
      roles: query(undefined, new Error("failed")),
      directPermissions: query([]),
      effectivePermissions: query({ effective: [], denied: [] }),
    });
    render(<UserAccessPanel userId="user-1" userName="张三" userHomeOrgId="org-1" orgId="org-1" orgOptions={[]} currentUserId="current" roles={[]} view="config" getOrgPath={() => "总部"} onViewChange={vi.fn()} onOrgIdChange={vi.fn()} onNavigateRole={vi.fn()} />);

    expect(screen.getByText("加载失败")).toBeVisible();
    expect(screen.getAllByText("0 项")).toHaveLength(2);
    expect(screen.getByText("角色配置内容")).toBeVisible();
  });
});
