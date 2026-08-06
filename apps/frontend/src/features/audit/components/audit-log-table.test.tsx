import type { AuditSearch } from "../lib/audit-search";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuditLogTable } from "./audit-log-table";

const { useAuditLogsMock } = vi.hoisted(() => ({
  useAuditLogsMock: vi.fn(),
}));

vi.mock("../hooks/use-audit-actions", () => ({
  useAuditActions: () => [],
}));

vi.mock("../hooks/use-audit-logs", () => ({
  useAuditLogs: useAuditLogsMock,
}));

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

describe("AuditLogTable actorKeyword 防抖", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuditLogsMock.mockReturnValue(emptyAuditLogs);
  });

  afterEach(() => {
    vi.useRealTimers();
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
      action: undefined,
      status: undefined,
      actorKeyword: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it("移除 actorKeyword chip 时取消待执行的关键词导航", () => {
    const onSearchChange = vi.fn();
    renderTable({ actorKeyword: "旧关键词", action: "projects.update" }, onSearchChange);

    fireEvent.change(screen.getByRole("textbox", { name: "操作人姓名" }), {
      target: { value: "新关键词" },
    });
    fireEvent.click(screen.getByRole("button", { name: "移除操作人：旧关键词筛选" }));

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
});
