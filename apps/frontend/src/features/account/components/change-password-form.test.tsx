import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./change-password-form";

const mocks = vi.hoisted(() => ({
  changeMyPassword: vi.fn(),
  navigate: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/api", () => ({
  default: { Me: { changeMyPassword: mocks.changeMyPassword } },
}));

vi.mock("@/lib/auth-client", () => ({ signOut: mocks.signOut }));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mocks.navigate }),
}));

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    mocks.changeMyPassword.mockReset();
    mocks.navigate.mockReset();
    mocks.signOut.mockReset();
  });

  it("两次新密码不一致时定位确认字段并阻止请求", async () => {
    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText("当前密码"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("新密码"), { target: { value: "new-password" } });
    const confirmation = screen.getByLabelText("确认新密码");
    fireEvent.change(confirmation, { target: { value: "different-password" } });
    fireEvent.blur(confirmation);

    expect(await screen.findByText("两次输入的新密码不一致")).toBeInTheDocument();
    expect(confirmation).toHaveAttribute("aria-invalid", "true");

    fireEvent.submit(screen.getByRole("button", { name: "修改密码" }).closest("form")!);
    expect(mocks.changeMyPassword).not.toHaveBeenCalled();
  });

  it("有效提交只发送当前密码和新密码并执行强制重登", async () => {
    mocks.changeMyPassword.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue(undefined);
    mocks.navigate.mockResolvedValue(undefined);
    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText("当前密码"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("新密码"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("确认新密码"), { target: { value: "new-password" } });

    fireEvent.submit(screen.getByRole("button", { name: "修改密码" }).closest("form")!);

    await vi.waitFor(() => {
      expect(mocks.changeMyPassword).toHaveBeenCalledWith({
        data: { currentPassword: "old-password", newPassword: "new-password" },
      });
      expect(mocks.signOut).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" });
    });
  });
});
