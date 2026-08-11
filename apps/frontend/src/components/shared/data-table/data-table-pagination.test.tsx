import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTablePagination } from "./data-table-pagination";

describe("DataTablePagination", () => {
  it("无数据时仍渲染并禁用分页控件", () => {
    const onPageChange = vi.fn();
    render(
      <DataTablePagination
        page={1}
        pageSize={25}
        pageCount={0}
        rowCount={0}
        pageSizeOptions={[25, 50, 100]}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const count = screen.getByText((_, element) => element?.getAttribute("aria-live") === "polite");
    expect(count).toHaveTextContent("0");
    const next = screen.getByRole("button", { name: "下一页" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("单页有数据时保留当前页并禁用前后跳转", () => {
    render(
      <DataTablePagination
        page={1}
        pageSize={10}
        pageCount={1}
        rowCount={1}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "上一页" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "下一页" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { current: "page" })).toHaveTextContent("1");
  });
});
