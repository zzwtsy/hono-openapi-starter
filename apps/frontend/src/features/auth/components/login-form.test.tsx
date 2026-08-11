import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const mocks = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("../hooks/use-login", () => ({
  useLogin: () => ({ login: mocks.login }),
}));

function fillLoginForm() {
  fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "user@example.com" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret" } });
}

describe("LoginForm", () => {
  beforeEach(() => {
    mocks.login.mockReset();
  });

  it("字段失焦前不显示错误，失焦后显示无效状态", async () => {
    render(<LoginForm />);
    const email = screen.getByLabelText("邮箱");

    expect(screen.queryByText("请输入有效邮箱")).not.toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "false");

    fireEvent.blur(email);

    expect(await screen.findByRole("alert")).toHaveTextContent("请输入有效邮箱");
    expect(email).toHaveAttribute("aria-invalid", "true");
  });

  it("无效提交展示全部字段错误且不调用登录", async () => {
    render(<LoginForm />);

    fireEvent.submit(screen.getByRole("button", { name: "登录" }).closest("form")!);

    expect(await screen.findByText("请输入有效邮箱")).toBeInTheDocument();
    expect(screen.getByText("请输入密码")).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("有效提交期间禁用按钮并透传安全回跳目标", async () => {
    let resolveLogin: (() => void) | undefined;
    mocks.login.mockReturnValue(new Promise<void>((resolve) => {
      resolveLogin = resolve;
    }));
    render(<LoginForm redirectTo="/projects" />);
    fillLoginForm();

    const button = screen.getByRole("button", { name: "登录" });
    fireEvent.submit(button.closest("form")!);

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith("user@example.com", "secret", "/projects");
      expect(button).toBeDisabled();
    });

    resolveLogin?.();
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  it("认证失败显示表单级 Alert 并恢复提交按钮", async () => {
    mocks.login.mockRejectedValue(new Error("邮箱或密码错误"));
    render(<LoginForm />);
    fillLoginForm();

    const button = screen.getByRole("button", { name: "登录" });
    fireEvent.submit(button.closest("form")!);

    expect(await screen.findByText("邮箱或密码错误")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("登录失败");
    expect(button).toBeEnabled();
  });
});
