import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { describe, expect, it, vi } from "vitest";

import { AuditLogFilters } from "./audit-log-filters";

const actions = [
  { action: "projects.update", label: "修改项目" },
  { action: "iam.user.create", label: "创建用户" },
];

function renderFilters(overrides: Partial<React.ComponentProps<typeof AuditLogFilters>> = {}) {
  const props: React.ComponentProps<typeof AuditLogFilters> = {
    actions,
    selectedActions: [],
    status: undefined,
    actorKeyword: "",
    from: undefined,
    to: undefined,
    onActionsChange: vi.fn(),
    onStatusChange: vi.fn(),
    onActorKeywordChange: vi.fn(),
    onActorKeywordClear: vi.fn(),
    onRangeChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(<AuditLogFilters {...props} />);
  return props;
}

describe("AuditLogFilters", () => {
  it("为筛选控件提供稳定且可区分的 accessible name", () => {
    renderFilters();

    expect(screen.getByRole("combobox", { name: "操作筛选" })).toHaveTextContent("全部操作");
    expect(screen.getByRole("combobox", { name: "结果筛选" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "操作人姓名" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择时间范围" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重置" })).not.toBeInTheDocument();
  });

  it("可搜索并连续选择多个操作类型", async () => {
    const onActionsChange = vi.fn();

    function ControlledFilters() {
      const [selectedActions, setSelectedActions] = useState<string[]>([]);
      return (
        <AuditLogFilters
          actions={actions}
          selectedActions={selectedActions}
          status={undefined}
          actorKeyword=""
          from={undefined}
          to={undefined}
          onActionsChange={(values) => {
            setSelectedActions(values);
            onActionsChange(values);
          }}
          onStatusChange={vi.fn()}
          onActorKeywordChange={vi.fn()}
          onActorKeywordClear={vi.fn()}
          onRangeChange={vi.fn()}
          onReset={vi.fn()}
        />
      );
    }

    render(<ControlledFilters />);
    fireEvent.click(screen.getByRole("combobox", { name: "操作筛选" }));
    const actionInput = await screen.findByRole("combobox", { name: "搜索操作" });
    fireEvent.change(actionInput, { target: { value: "修改" } });
    const option = await screen.findByRole("option", { name: "修改项目" });
    expect(screen.queryByText("projects.update")).not.toBeInTheDocument();
    fireEvent.click(option);
    fireEvent.change(actionInput, { target: { value: "创建" } });
    fireEvent.click(await screen.findByRole("option", { name: "创建用户" }));

    expect(onActionsChange).toHaveBeenLastCalledWith(["projects.update", "iam.user.create"]);
    expect(screen.getByRole("combobox", { name: "操作筛选" })).toHaveTextContent("已选 2 项");
  });

  it("未知 URL 操作值保留筛选但不显示机器代码", () => {
    renderFilters({ selectedActions: ["custom.unknown-action"] });

    expect(screen.getByRole("combobox", { name: "操作筛选" })).toHaveTextContent("未知操作");
    expect(screen.queryByText("custom.unknown-action")).not.toBeInTheDocument();
  });

  it("结果菜单从触发器下方展开而不覆盖筛选条", async () => {
    renderFilters();

    const trigger = screen.getByRole("combobox", { name: "结果筛选" });
    fireEvent.click(trigger);
    const listbox = await screen.findByRole("listbox");
    const popup = listbox.closest("[data-slot=\"select-content\"]");

    expect(popup).toHaveAttribute("data-align-trigger", "false");
  });

  it("操作人输入使用规范属性并支持立即清除", () => {
    const onActorKeywordClear = vi.fn();
    renderFilters({ actorKeyword: "Admin", onActorKeywordClear });

    const actorInput = screen.getByRole("textbox", { name: "操作人姓名" });
    expect(actorInput).toHaveAttribute("name", "actorKeyword");
    expect(actorInput).toHaveAttribute("autocomplete", "off");
    fireEvent.click(screen.getByRole("button", { name: "清除操作人筛选" }));

    expect(onActorKeywordClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "重置" })).toBeInTheDocument();
  });
});
