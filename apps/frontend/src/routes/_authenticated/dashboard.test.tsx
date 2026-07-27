import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";

// mock @tanstack/react-router:useRouteContext 控 permissions;createFileRoute 返回空 Route。
const { useRouteContextMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouteContext: useRouteContextMock,
  createFileRoute: () => () => ({}),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    useRouteContextMock.mockReset();
  });

  it("无权限时显示空状态提示(引导联系管理员)", () => {
    useRouteContextMock.mockReturnValue([]);
    render(<Dashboard />);

    expect(screen.getByText("暂无可用功能")).toBeInTheDocument();
    expect(screen.getByText(/联系管理员授权/)).toBeInTheDocument();
  });

  it("有权限时显示概览占位", () => {
    useRouteContextMock.mockReturnValue(["projects.read"]);
    render(<Dashboard />);

    expect(screen.getByText("概览页待实现。")).toBeInTheDocument();
  });
});
