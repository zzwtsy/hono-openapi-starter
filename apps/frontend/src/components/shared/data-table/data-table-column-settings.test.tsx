import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTableColumnSettings } from "./data-table-column-settings";

const columns = [
  { id: "name", label: "名称", visible: true, canHide: true },
  { id: "description", label: "描述", visible: true, canHide: true },
] as const;

describe("DataTableColumnSettings", () => {
  it("为每一列注册可访问的拖拽手柄", async () => {
    render(
      <DataTableColumnSettings
        columns={columns}
        order={["name", "description"]}
        onToggle={vi.fn()}
        onMove={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "列设置" }));
    const list = await screen.findByRole("list", { name: "可配置列" });
    const handles = within(list).getAllByRole("button", { name: /拖拽列/ });

    expect(handles).toHaveLength(2);
    await waitFor(() => {
      expect(handles[0]).toHaveAttribute("aria-roledescription", "draggable");
      expect(handles[0]).toHaveAttribute("aria-describedby");
    });
  });
});
