import type { UserSummary } from "@/api/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { http, okEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { OrganizationForm } from "./organization-form";
import { ResetPasswordDialog } from "./reset-password-dialog";
import "@/test/msw/setup";

const user: UserSummary = {
  id: "user-1",
  name: "张三",
  email: "user@example.com",
  orgId: "org-1",
  disabled: false,
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("IAM 表单提交校验", () => {
  it("组织表单无效提交显示错误、聚焦名称且不发送请求", async () => {
    let requestCount = 0;
    server.use(
      http.post("*/api/v1/organizations", () => {
        requestCount += 1;
        return okEnvelope({});
      }),
    );
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <OrganizationForm organizations={[]} onSuccess={vi.fn()} />
        </DialogContent>
      </Dialog>,
    );

    fireEvent.submit(screen.getByRole("button", { name: "创建" }).closest("form")!);

    const name = screen.getByLabelText("名称");
    expect(await screen.findByRole("alert")).toHaveTextContent("请输入组织名");
    expect(name).toHaveAttribute("aria-invalid", "true");
    await vi.waitFor(() => {
      expect(name).toHaveFocus();
    });
    expect(requestCount).toBe(0);
  });

  it("重置密码无效提交显示错误、聚焦密码且不发送请求", async () => {
    let requestCount = 0;
    server.use(
      http.post("*/api/v1/users/user-1/reset-password", () => {
        requestCount += 1;
        return okEnvelope({});
      }),
    );
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <ResetPasswordDialog user={user} onSuccess={vi.fn()} />
        </DialogContent>
      </Dialog>,
    );

    fireEvent.submit(screen.getByRole("button", { name: "重置" }).closest("form")!);

    const password = screen.getByLabelText("新密码");
    expect(await screen.findByRole("alert")).toHaveTextContent("密码至少 8 位");
    expect(password).toHaveAttribute("aria-invalid", "true");
    await vi.waitFor(() => {
      expect(password).toHaveFocus();
    });
    expect(requestCount).toBe(0);
  });
});
