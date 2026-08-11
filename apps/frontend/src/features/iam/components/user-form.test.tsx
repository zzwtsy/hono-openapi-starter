import type { ComponentProps } from "react";
import type { UserSummary } from "@/api/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { http, okEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
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

  it("创建无效提交展示全部错误、聚焦首项且不发送请求", async () => {
    let requestCount = 0;
    server.use(
      http.post("*/api/v1/users", () => {
        requestCount += 1;
        return okEnvelope(user);
      }),
    );
    renderUserForm({ onSuccess: vi.fn(), orgOptions: [], defaultOrgId: "" });

    fireEvent.submit(screen.getByRole("button", { name: "创建" }).closest("form")!);

    expect(await screen.findAllByRole("alert")).toHaveLength(4);
    const controls = [
      screen.getByLabelText("显示名"),
      screen.getByLabelText("邮箱"),
      screen.getByLabelText("初始密码"),
      screen.getByLabelText("归属组织"),
    ];
    for (const control of controls) {
      expect(control).toHaveAttribute("aria-invalid", "true");
    }
    await vi.waitFor(() => {
      expect(controls[0]).toHaveFocus();
    });
    expect(requestCount).toBe(0);
  });

  it("创建有效提交保持现有 payload 契约", async () => {
    let requestBody: unknown;
    server.use(
      http.post("*/api/v1/users", async ({ request }) => {
        requestBody = await request.json();
        return okEnvelope(user);
      }),
    );
    const onSuccess = vi.fn();
    renderUserForm({
      onSuccess,
      orgOptions: [{ label: "总部", value: "org-1" }],
      defaultOrgId: "org-1",
    });
    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: "张三" } });
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("初始密码"), { target: { value: "password-123" } });

    fireEvent.submit(screen.getByRole("button", { name: "创建" }).closest("form")!);

    await vi.waitFor(() => {
      expect(requestBody).toEqual({
        name: "张三",
        email: "user@example.com",
        password: "password-123",
        orgId: "org-1",
      });
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });
});
