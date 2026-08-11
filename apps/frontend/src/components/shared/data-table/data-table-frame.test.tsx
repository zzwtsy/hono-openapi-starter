import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableRow } from "@/components/ui/table";
import { DataTableHeader, DataTableViewport } from "./data-table-frame";

describe("DataTableViewport", () => {
  it("作为表格唯一滚动容器，避免内层 Table wrapper 破坏 sticky 表头", () => {
    render(
      <DataTableViewport>
        <Table aria-label="测试表格" />
      </DataTableViewport>,
    );

    const tableContainer = screen.getByRole("table", { name: "测试表格" }).parentElement;
    expect(tableContainer?.parentElement).toHaveClass(
      "overflow-auto",
      "*:data-[slot=table-container]:overflow-visible",
    );
  });

  it("固定表头使用不透明背景和稳定的底部分隔线", () => {
    render(
      <Table>
        <DataTableHeader>
          <TableRow />
        </DataTableHeader>
      </Table>,
    );

    expect(screen.getByRole("rowgroup")).toHaveClass(
      "sticky",
      "top-0",
      "bg-card",
      "shadow-[0_1px_0_var(--border)]",
    );
  });
});
