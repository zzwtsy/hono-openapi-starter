import type { UserSummary } from "@/api/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserListPanel } from "./user-list";

const users: UserSummary[] = [
  { id: "user-1", name: "张三", email: "zhang@example.com", orgId: "org-1", disabled: false, createdAt: "2026-08-01" },
  { id: "user-2", name: "李四", email: "li@example.com", orgId: "org-1", disabled: true, createdAt: "2026-08-01" },
];

describe("UserListPanel", () => {
  it("支持邮箱搜索、选中语义和状态展示", () => {
    const onSelect = vi.fn();
    render(
      <UserListPanel
        users={users}
        selectedUserId="user-2"
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("button", { name: /李四/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("已禁用")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("搜索用户"), { target: { value: "zhang@" } });
    fireEvent.click(screen.getByRole("button", { name: /张三/ }));
    expect(onSelect).toHaveBeenCalledWith(users[0]);
    expect(screen.queryByRole("button", { name: "新建用户" })).not.toBeInTheDocument();
  });
});
