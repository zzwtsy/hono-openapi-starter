import { render, screen } from "@testing-library/react";
import { Pencil, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ResourceActions } from "./resource-actions";

describe("ResourceActions", () => {
  it("全部项 allowed=false 时返回 null(不渲染 trigger)", () => {
    const { container } = render(
      <ResourceActions
        items={[
          { id: "edit", allowed: false, label: "编辑", icon: Pencil, onClick: vi.fn() },
          { id: "delete", allowed: false, label: "删除", icon: Trash2, onClick: vi.fn() },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("有可见项时渲染 trigger 按钮(aria-label 默认「操作」)", () => {
    render(
      <ResourceActions
        items={[{ id: "edit", allowed: true, label: "编辑", icon: Pencil, onClick: vi.fn() }]}
      />,
    );
    expect(screen.getByRole("button", { name: "操作" })).toBeInTheDocument();
  });

  it("仅渲染 allowed 的项(展开菜单后)", async () => {
    render(
      <ResourceActions
        items={[
          { id: "edit", allowed: true, label: "编辑", icon: Pencil, onClick: vi.fn() },
          { id: "delete", allowed: false, label: "删除", icon: Trash2, onClick: vi.fn() },
        ]}
      />,
    );
    screen.getByRole("button", { name: "操作" }).click();
    expect(await screen.findByText("编辑")).toBeInTheDocument();
    expect(screen.queryByText("删除")).not.toBeInTheDocument();
  });

  it("禁用项提供 tooltip trigger 和可访问原因", async () => {
    render(
      <ResourceActions
        items={[
          {
            id: "delete",
            allowed: true,
            label: "删除",
            icon: Trash2,
            variant: "destructive",
            disabled: true,
            disabledReason: "不可删除",
            onClick: vi.fn(),
          },
        ]}
      />,
    );
    screen.getByRole("button", { name: "操作" }).click();
    const itemEl = await screen.findByRole("menuitem", { name: "删除" });
    expect(itemEl).toHaveAttribute("data-variant", "destructive");
    expect(itemEl).toHaveAttribute("data-disabled");
    expect(itemEl).toHaveAttribute("aria-description", "不可删除");
    expect(itemEl.parentElement).toHaveAttribute("data-base-ui-tooltip-trigger");
  });
});
