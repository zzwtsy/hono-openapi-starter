import type { ComponentProps } from "react";
import type { UserSummary } from "@/api/globals";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserForm } from "./user-form";

const user: UserSummary = {
  id: "user-1",
  name: "张三",
  email: "user@example.com",
  orgId: "org-1",
  disabled: false,
  createdAt: "2026-08-01T00:00:00.000Z",
};

function renderUserForm(props: ComponentProps<typeof UserForm>) {
  return render(
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <UserForm {...props} />
      </DialogContent>
    </Dialog>,
  );
}

describe("UserForm", () => {
  it("创建模式显示密码和归属组织字段", () => {
    renderUserForm({
      onSuccess: vi.fn(),
      orgOptions: [{ label: "总部", value: "org-1" }],
      defaultOrgId: "org-1",
    });

    expect(screen.getByLabelText("初始密码")).toBeRequired();
    expect(screen.getByLabelText("归属组织")).toBeInTheDocument();
    expect(screen.getByLabelText("显示名")).toHaveAttribute("name", "name");
    expect(screen.getByLabelText("邮箱")).toHaveAttribute("name", "email");
  });

  it("编辑模式只展示可编辑身份字段", () => {
    renderUserForm({ user, onSuccess: vi.fn() });

    expect(screen.getByLabelText("显示名")).toHaveValue("张三");
    expect(screen.getByLabelText("邮箱")).toHaveValue("user@example.com");
    expect(screen.queryByLabelText("初始密码")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("归属组织")).not.toBeInTheDocument();
  });
});
