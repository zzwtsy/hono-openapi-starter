import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCanMap, usePermissions } from "./use-permissions";

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

describe("useCanMap", () => {
  beforeEach(() => {
    useRouteContextMock.mockReset();
  });

  it("permissions 为 undefined 时所有 key 返回 false", () => {
    useRouteContextMock.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useCanMap(["projects.update", "projects.delete"] as const),
    );
    expect(result.current).toEqual({ "projects.update": false, "projects.delete": false });
  });

  it("持有部分权限时返回对应布尔映射", () => {
    useRouteContextMock.mockReturnValue(["projects.update"]);
    const { result } = renderHook(() =>
      useCanMap(["projects.update", "projects.delete"] as const),
    );
    expect(result.current).toEqual({ "projects.update": true, "projects.delete": false });
  });

  it("持有全部权限时全部 true", () => {
    useRouteContextMock.mockReturnValue(["projects.update", "projects.delete"]);
    const { result } = renderHook(() =>
      useCanMap(["projects.update", "projects.delete"] as const),
    );
    expect(result.current).toEqual({ "projects.update": true, "projects.delete": true });
  });

  it("空数组返回空对象", () => {
    useRouteContextMock.mockReturnValue(["projects.update"]);
    const { result } = renderHook(() => useCanMap([] as const));
    expect(result.current).toEqual({});
  });
});
