import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserAccessData } from "./use-user-access-data";

const { useWatcherMock, actionDelegationMiddlewareMock } = vi.hoisted(() => ({
  useWatcherMock: vi.fn(),
  actionDelegationMiddlewareMock: vi.fn(() => undefined),
}));

vi.mock("alova/client", () => ({
  useWatcher: useWatcherMock,
  actionDelegationMiddleware: actionDelegationMiddlewareMock,
}));
vi.mock("@/api", () => ({
  default: {
    IAM: {
      listUserRoles: vi.fn(),
      listUserDirectPermissions: vi.fn(),
      listUserPermissions: vi.fn(),
    },
  },
}));

describe("useUserAccessData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWatcherMock.mockReturnValue({ data: undefined, loading: false, error: null, send: vi.fn() });
  });

  it("三个查询共享用户和组织依赖，但保持独立状态", () => {
    renderHook(() => useUserAccessData("user-1", "org-1", true));

    expect(useWatcherMock).toHaveBeenCalledTimes(3);
    for (const call of useWatcherMock.mock.calls) {
      expect(call[1]).toEqual(["user-1", "org-1"]);
      expect(call[2]).toMatchObject({ immediate: true });
    }
  });

  it("无读取能力时三个查询都不立即发送", () => {
    renderHook(() => useUserAccessData("user-1", "org-1", false));

    for (const call of useWatcherMock.mock.calls) {
      expect(call[2]).toMatchObject({ immediate: false });
    }
  });
});
