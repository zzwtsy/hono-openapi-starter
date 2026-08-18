import type { AuditSearch } from "../lib/audit-search";
import type { AuditLog } from "@/api/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuditLogTable } from "./audit-log-table";

const { useAuditLogsMock, useIsMobileMock } = vi.hoisted(() => ({
  useAuditLogsMock: vi.fn(),
  useIsMobileMock: vi.fn(),
}));

vi.mock("../hooks/use-audit-actions", () => ({
  useAuditActions: () => [{ action: "iam.user.update", label: "修改用户" }],
}));

vi.mock("../hooks/use-audit-logs", () => ({
  useAuditLogs: useAuditLogsMock,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: useIsMobileMock,
}));

const auditLog: AuditLog = {
  id: "audit-1",
  actorUserId: "user-admin",
  actorName: "管理员",
  actorOrgId: "org-root",
  action: "iam.user.update",
  resourceRefs: [{ type: "user", id: "user-1", name: "张三" }],
  beforeState: { name: "旧名称" },
  afterState: { name: "张三" },
  changedFields: ["name"],
  ipAddress: "127.0.0.1",
  userAgent: "Vitest",
  requestId: "request-1",
  status: "success",
  errorCode: null,
  metadata: null,
  occurredAt: "2026-07-01T12:00:00.000Z",
  recordedAt: "2026-07-01T12:00:01.000Z",
};

const emptyAuditLogs = {
  data: {
    items: [],
    meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
  },
  loading: false,
  error: null,
  send: vi.fn(),
};

function renderTable(search: AuditSearch, onSearchChange = vi.fn()) {
  return render(<AuditLogTable search={search} onSearchChange={onSearchChange} />);
}

describe("AuditLogTable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useIsMobileMock.mockReturnValue(false);
    useAuditLogsMock.mockReturnValue(emptyAuditLogs);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("仅在分页区域展示总条数", () => {
    const { container } = renderTable({});

    expect(container.querySelectorAll("[aria-live=\"polite\"]")).toHaveLength(1);
  });

  it("刷新当前筛选结果且不修改 URL 状态", () => {
    const send = vi.fn();
    const onSearchChange = vi.fn();
    useAuditLogsMock.mockReturnValue({ ...emptyAuditLogs, send });
    renderTable({ actions: ["auth.sign-in", "iam.role.create"], page: 2 }, onSearchChange);

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));

    expect(send).toHaveBeenCalledTimes(1);
    expect(onSearchChange).not.toHaveBeenCalled();
    expect(useAuditLogsMock).toHaveBeenCalledWith(expect.objectContaining({
      actions: ["auth.sign-in", "iam.role.create"],
    }));
  });

  it("刷新请求进行中时禁止重复提交", () => {
    useAuditLogsMock.mockReturnValue({ ...emptyAuditLogs, data: undefined, loading: true });
    renderTable({});

    const refreshButton = screen.getByRole("button", { name: "刷新" });
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("combobox", { name: "操作筛选" })).toBeInTheDocument();
  });

  it("重置时取消待执行的关键词导航", () => {
    const onSearchChange = vi.fn();
    renderTable({ actorKeyword: "旧关键词" }, onSearchChange);

    fireEvent.change(screen.getByRole("textbox", { name: "操作人姓名" }), {
      target: { value: "新关键词" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重置" }));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith({
      actions: undefined,
      status: undefined,
      actorKeyword: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it("清除操作人筛选时取消待执行的关键词导航", () => {
    const onSearchChange = vi.fn();
    renderTable({ actorKeyword: "旧关键词", actions: ["projects.update"] }, onSearchChange);

    fireEvent.change(screen.getByRole("textbox", { name: "操作人姓名" }), {
      target: { value: "新关键词" },
    });
    fireEvent.click(screen.getByRole("button", { name: "清除操作人筛选" }));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith({ actorKeyword: undefined });
  });

  it("url 外部变化会同步输入并取消旧关键词导航", () => {
    const onSearchChange = vi.fn();
    const { rerender } = renderTable({ actorKeyword: "旧关键词" }, onSearchChange);

    fireEvent.change(screen.getByRole("textbox", { name: "操作人姓名" }), {
      target: { value: "输入中的关键词" },
    });
    rerender(<AuditLogTable search={{ actorKeyword: "来自 URL" }} onSearchChange={onSearchChange} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "操作人姓名" })).toHaveValue("来自 URL");
  });

  it("桌面保留原生表格行语义并通过固定详情按钮打开日志", () => {
    useAuditLogsMock.mockReturnValue({
      ...emptyAuditLogs,
      data: { items: [auditLog], meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } },
    });
    const { container } = renderTable({});

    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
      "时间(本地)",
      "操作人",
      "操作",
      "对象",
      "结果",
      "详情",
    ]);
    expect(container.querySelector("tr[role=button]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "查看操作日志详情：修改用户" }));
    expect(screen.getByRole("heading", { name: /修改用户/ })).toBeInTheDocument();
  });

  it("移动端使用事件摘要列表和筛选 Sheet", () => {
    useIsMobileMock.mockReturnValue(true);
    useAuditLogsMock.mockReturnValue({
      ...emptyAuditLogs,
      data: { items: [auditLog], meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } },
    });
    const onSearchChange = vi.fn();
    const { container } = renderTable({}, onSearchChange);

    expect(container.querySelector("table")).toBeNull();
    expect(screen.getByRole("button", { name: /查看操作日志：修改用户/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "筛选" }));
    expect(screen.getByRole("heading", { name: "筛选操作日志" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "操作人姓名" }), { target: { value: "Admin" } });
    fireEvent.click(screen.getByRole("button", { name: "应用筛选（1）" }));
    expect(onSearchChange).toHaveBeenCalledWith(expect.objectContaining({ actorKeyword: "Admin" }));
  });
});
