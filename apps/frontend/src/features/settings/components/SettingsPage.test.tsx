import type { SystemSetting } from "@/api/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { invalidateCache } from "alova";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { failEnvelope, http, okEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { SettingsPage } from "./SettingsPage";

const useCanMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

// mock useCan,避免 RouterProvider;仍渲染真实 SettingsPage 分支。
vi.mock("@/hooks/use-permissions", () => ({
  useCan: (perm: string): boolean => useCanMock(perm) as boolean,
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => {
      toastSuccess(...args);
    },
    error: (...args: unknown[]) => {
      toastError(...args);
    },
  },
}));

const signUpOn: SystemSetting = {
  key: "signUp",
  value: { enabled: true },
  updatedAt: "2026-07-15T00:00:00.000Z",
  updatedByUserId: "u-1",
};

function mockListSettings(data: SystemSetting[] | (() => Promise<SystemSetting[]>)) {
  server.use(
    http.get("*/api/v1/settings", async () => {
      const body = typeof data === "function" ? await data() : data;
      return okEnvelope(body);
    }),
  );
}

describe("SettingsPage", () => {
  beforeEach(async () => {
    useCanMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    // 清 alova GET 缓存,避免用例间串数据
    await invalidateCache();
    useCanMock.mockImplementation((perm: string) => perm === "settings.update");
  });

  it("加载失败时显示错误与重试", async () => {
    server.use(
      http.get("*/api/v1/settings", () => failEnvelope("后端错误")),
    );

    render(<SettingsPage />);

    expect(await screen.findByText("加载失败")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("无 signUp 记录时开关为关", async () => {
    mockListSettings([]);

    render(<SettingsPage />);

    expect(await screen.findByText("当前已关闭")).toBeInTheDocument();
    const sw = screen.getByRole("switch", { name: "允许用户自助注册" });
    expect(sw).toHaveAttribute("data-unchecked");
  });

  it("有 signUp enabled=true 时开关为开", async () => {
    mockListSettings([signUpOn]);

    render(<SettingsPage />);

    expect(await screen.findByText("当前已开启")).toBeInTheDocument();
    const sw = screen.getByRole("switch", { name: "允许用户自助注册" });
    expect(sw).toHaveAttribute("data-checked");
  });

  it("无 settings.update 时开关 disabled 且文案只读", async () => {
    useCanMock.mockReturnValue(false);
    mockListSettings([signUpOn]);

    render(<SettingsPage />);

    expect(await screen.findByText(/只读/)).toBeInTheDocument();
    const sw = screen.getByRole("switch", { name: "允许用户自助注册" });
    // Base UI Switch 用 aria-disabled + data-disabled,不是原生 disabled 属性
    expect(sw).toHaveAttribute("aria-disabled", "true");
    expect(sw).toHaveAttribute("data-disabled");
  });

  it("可写权限下切换会 PATCH 并 toast", async () => {
    let listData: SystemSetting[] = [signUpOn];
    const patches: unknown[] = [];

    server.use(
      http.get("*/api/v1/settings", () => okEnvelope(listData)),
      http.patch("*/api/v1/settings/:key", async ({ request, params }) => {
        const body = await request.json();
        patches.push({ key: params.key, body });
        listData = [{
          ...signUpOn,
          value: (body as { value: { enabled: boolean } }).value,
        }];
        return okEnvelope(listData[0]);
      }),
    );

    render(<SettingsPage />);

    const sw = await screen.findByRole("switch", { name: "允许用户自助注册" });
    expect(sw).toHaveAttribute("data-checked");

    // Base UI Switch:触发 onCheckedChange
    sw.click();

    await waitFor(() => {
      expect(patches).toHaveLength(1);
    });
    expect(patches[0]).toEqual({
      key: "signUp",
      body: { value: { enabled: false } },
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText("当前已关闭")).toBeInTheDocument();
    });
  });
});
