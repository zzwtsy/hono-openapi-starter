import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePermissions } from "./use-permissions";

// mock @tanstack/react-router:useRouteContext 控 permissions 切片。
const { useRouteContextMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouteContext: useRouteContextMock,
}));

describe("usePermissions", () => {
  beforeEach(() => {
    useRouteContextMock.mockReset();
  });

  it("返回 context 中的 permissions 切片", () => {
    useRouteContextMock.mockReturnValue(["projects.read"]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toEqual(["projects.read"]);
  });

  it("未登录/未加载时返回 undefined", () => {
    useRouteContextMock.mockReturnValue(undefined);
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toBeUndefined();
  });
});
