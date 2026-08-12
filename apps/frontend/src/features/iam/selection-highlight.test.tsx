import type { ReactNode } from "react";
import type { Role, UserSummary } from "@/api/globals";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolesPage } from "./roles-page";
import { UsersPage } from "./users-page";

const { useRequestMock } = vi.hoisted(() => ({
  useRequestMock: vi.fn(),
}));

vi.mock("alova/client", () => ({
  actionDelegationMiddleware: vi.fn(),
  useRequest: useRequestMock,
}));

vi.mock("@/components/shared/can", () => ({
  Can: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => children,
  DialogContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-permissions", () => ({
  useCan: vi.fn(() => false),
}));

vi.mock("./components/iam-workbench", () => ({
  IamWorkbench: ({ navigation }: { navigation: ReactNode }) => navigation,
}));

vi.mock("./hooks/use-user-page-state", () => ({
  useUserPageState: vi.fn(() => ({ orgOptions: [], getOrgPath: vi.fn() })),
}));

const roles: Role[] = [
  { id: "role-1", name: "管理员", description: "管理全部资源", source: "code", createdAt: "2026-08-01", updatedAt: "2026-08-01" },
  { id: "role-2", name: "审计员", description: "查看操作日志", source: "instance", createdAt: "2026-08-01", updatedAt: "2026-08-01" },
];

const users: UserSummary[] = [
  { id: "user-1", name: "张三", email: "zhang@example.com", orgId: "org-1", disabled: false, createdAt: "2026-08-01" },
  { id: "user-2", name: "李四", email: "li@example.com", orgId: "org-1", disabled: false, createdAt: "2026-08-01" },
];

describe("IAM 默认选择高亮", () => {
  beforeEach(() => {
    useRequestMock.mockReset();
  });

  it("角色 URL 未指定 role 时高亮首个角色", () => {
    useRequestMock.mockReturnValue({ data: roles, loading: false, error: null, send: vi.fn() });

    render(
      <RolesPage
        onSelectedRoleChange={vi.fn()}
        onTabChange={vi.fn()}
        onNavigateUser={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /管理员/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /审计员/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("用户 URL 未指定 user 时高亮首个用户", () => {
    useRequestMock
      .mockReturnValueOnce({ data: [], loading: false, error: null, send: vi.fn() })
      .mockReturnValueOnce({ data: users, loading: false, error: null, send: vi.fn() });

    render(
      <UsersPage
        homeOrgId="org-1"
        currentUserId="current-user"
        onSelectedUserChange={vi.fn()}
        onOrgIdChange={vi.fn()}
        onTabChange={vi.fn()}
        onNavigateRole={vi.fn()}
        onTransferred={vi.fn()}
        renderAuditTimeline={() => null}
      />,
    );

    expect(screen.getByRole("button", { name: /张三/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /李四/ })).toHaveAttribute("aria-pressed", "false");
  });
});
