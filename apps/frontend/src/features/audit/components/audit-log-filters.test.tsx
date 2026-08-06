import { render, screen } from "@testing-library/react";

import { describe, expect, it, vi } from "vitest";

import { AuditLogFilters } from "./audit-log-filters";

vi.mock("../hooks/use-audit-actions", () => ({
  useAuditActions: () => [],
}));

describe("AuditLogFilters", () => {
  it("为筛选控件提供稳定且可区分的 accessible name", () => {
    render(
      <AuditLogFilters
        action={undefined}
        status={undefined}
        actorKeyword=""
        from={undefined}
        to={undefined}
        onActionChange={vi.fn()}
        onStatusChange={vi.fn()}
        onActorKeywordChange={vi.fn()}
        onRangeChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "操作筛选" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "结果筛选" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "操作人姓名" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择时间范围" })).toBeInTheDocument();
  });
});
