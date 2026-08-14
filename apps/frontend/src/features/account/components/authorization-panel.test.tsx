import type { MyAuthorization } from "@/api/globals";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationPanel } from "./authorization-panel";

const mocks = vi.hoisted(() => ({
  useRequest: vi.fn(),
  getMyAuthorization: vi.fn(),
}));

vi.mock("alova/client", () => ({
  actionDelegationMiddleware: vi.fn(),
  useRequest: mocks.useRequest,
}));

vi.mock("@/api", () => ({
  default: { IAM: { getMyAuthorization: mocks.getMyAuthorization } },
}));

const authorization: MyAuthorization = {
  orgId: "org-home",
  roles: [{ roleId: "role-viewer", roleName: "查看者", orgId: "org-root", expiresAt: null }],
  directPermissions: [{
    permission: {
      code: "projects.read",
      resourceCode: "projects",
      actionCode: "read",
      resourceLabel: "项目",
      label: "查看项目",
    },
    effect: "deny",
    orgId: "org-home",
    expiresAt: "2020-01-01T00:00:00.000Z",
  }],
  effective: {
    effective: [{
      permission: {
        code: "projects.create",
        resourceCode: "projects",
        actionCode: "create",
        resourceLabel: "项目",
        label: "创建项目",
      },
      sources: [{ type: "role", roleId: "role-viewer", roleName: "查看者", orgId: "org-root", expiresAt: null }],
    }],
    denied: [{
      permission: {
        code: "projects.read",
        resourceCode: "projects",
        actionCode: "read",
        resourceLabel: "项目",
        label: "查看项目",
      },
      deniedBy: [{ orgId: "org-home", expiresAt: "2020-01-01T00:00:00.000Z" }],
      suppressedSources: [],
    }],
  },
};

describe("AuthorizationPanel", () => {
  beforeEach(() => {
    mocks.useRequest.mockReset();
    mocks.getMyAuthorization.mockReset();
  });

  it("展示原始授权、有效权限和 deny 来源", () => {
    mocks.useRequest.mockReturnValue({ data: authorization, loading: false, error: null, send: vi.fn() });

    render(<AuthorizationPanel />);

    expect(screen.getByText("org-home")).toBeInTheDocument();
    expect(screen.getAllByText("查看者").length).toBeGreaterThan(0);
    expect(screen.getByText("拒绝")).toBeInTheDocument();
    expect(screen.getByText("创建项目")).toBeInTheDocument();
    expect(screen.getAllByText("被 deny 抵消").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已过期").length).toBeGreaterThan(0);
  });

  it("授权到期时自动更新过期徽章", () => {
    vi.useFakeTimers();
    try {
      const futureAuthorization: MyAuthorization = {
        ...authorization,
        roles: [{ ...authorization.roles[0], expiresAt: new Date(Date.now() + 1_000).toISOString() }],
        directPermissions: [],
        effective: { ...authorization.effective, denied: [] },
      };
      mocks.useRequest.mockReturnValue({ data: futureAuthorization, loading: false, error: null, send: vi.fn() });

      render(<AuthorizationPanel />);

      expect(screen.getByText(/^至 /)).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(1_001);
      });
      expect(screen.queryByText(/^至 /)).not.toBeInTheDocument();
      expect(screen.getByText("已过期")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
