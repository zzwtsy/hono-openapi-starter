import type { Role } from "@/api/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoleListPanel } from "./role-list";

const roles: Role[] = [
  { id: "role-1", name: "管理员", description: "管理全部资源", source: "code", createdAt: "2026-08-01", updatedAt: "2026-08-01" },
  { id: "role-2", name: "审计员", description: "查看操作日志", source: "instance", createdAt: "2026-08-01", updatedAt: "2026-08-01" },
];

describe("RoleListPanel", () => {
  it("支持搜索、选中语义和点击选择", () => {
    const onSelect = vi.fn();
    render(
      <RoleListPanel
        roles={roles}
        selectedRoleId="role-1"
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("button", { name: /管理员/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByLabelText("搜索角色"), { target: { value: "审计" } });
    expect(screen.queryByText("管理员")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /审计员/ }));
    expect(onSelect).toHaveBeenCalledWith(roles[1]);
    expect(screen.queryByRole("button", { name: "新建角色" })).not.toBeInTheDocument();
  });
});
