import type { AuditLog } from "@/api/globals";
import { fireEvent, render, screen } from "@testing-library/react";

import { describe, expect, it } from "vitest";

import { AuditDiffList } from "./audit-diff-list";

/** 快照字面量 -> AuditLog 快照类型(wormhole 生成的 Record<string, undefined> 不接受普通对象字面量)。 */
function snap<T extends Record<string, unknown> | unknown[] | null>(value: T): AuditLog["beforeState"] {
  return value as unknown as AuditLog["beforeState"];
}

describe("AuditDiffList", () => {
  it("changed:逐字段显示 旧值 → 新值,带变更前缀", () => {
    render(
      <AuditDiffList
        before={snap({ name: "旧名", orgId: "org-a" })}
        after={snap({ name: "新名", orgId: "org-a" })}
        changedFields={["name", "orgId"]}
      />,
    );

    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("旧名")).toBeInTheDocument();
    expect(screen.getByText("新名")).toBeInTheDocument();
    // 值相同的 orgId 不进 diff
    expect(screen.queryByText("orgId")).not.toBeInTheDocument();
  });

  it("added:仅 after 有值(create 场景),渲染 ins 语义元素", () => {
    const { container } = render(
      <AuditDiffList
        before={snap(null)}
        after={snap({ name: "项目A", orgId: "org-a" })}
        changedFields={["name", "orgId"]}
      />,
    );

    expect(screen.getByText("项目A")).toBeInTheDocument();
    expect(container.querySelector("ins")).not.toBeNull();
    expect(container.querySelector("del")).toBeNull();
  });

  it("removed:仅 before 有值(delete 场景),渲染 del 语义元素", () => {
    const { container } = render(
      <AuditDiffList
        before={snap({ name: "旧项目", orgId: "org-a" })}
        after={snap(null)}
        changedFields={["name"]}
      />,
    );

    expect(screen.getByText("旧项目")).toBeInTheDocument();
    expect(container.querySelector("del")).not.toBeNull();
    expect(container.querySelector("ins")).toBeNull();
  });

  it("changed 时 _names 关联名称优先于裸 id", () => {
    render(
      <AuditDiffList
        before={snap({ orgId: "org-a" })}
        after={snap({ orgId: "org-b", _names: { orgId: "华南总部" } })}
        changedFields={["orgId"]}
      />,
    );

    expect(screen.getByText("华南总部")).toBeInTheDocument();
    // before 侧无 _names,显示裸 id
    expect(screen.getByText("org-a")).toBeInTheDocument();
  });

  it("changedFields 里的 _names 键被过滤(展示辅助键不进 diff)", () => {
    render(
      <AuditDiffList
        before={snap({ orgId: "org-a", _names: { orgId: "旧总部" } })}
        after={snap({ orgId: "org-b", _names: { orgId: "新总部" } })}
        changedFields={["orgId", "_names"]}
      />,
    );

    expect(screen.queryByText("_names")).not.toBeInTheDocument();
  });

  it("数组输入:单行摘要(权限列表)", () => {
    render(
      <AuditDiffList
        before={snap(["projects.read", "users.read"])}
        after={snap(["projects.read", "users.write"])}
        changedFields={["0", "1"]}
      />,
    );

    // 数组内容以 JSON 形式出现在同一行(before/after 各一次,不逐项渲染 0/1 索引)
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getAllByText(/projects\.read/).length).toBeGreaterThan(0);
  });

  it("长值折叠:超 120 字符截断,可展开", () => {
    const long = "长".repeat(200);
    render(
      <AuditDiffList
        before={snap({ description: "短" })}
        after={snap({ description: long })}
        changedFields={["description"]}
      />,
    );

    const collapsed = screen.getByText(/长{120}…/);
    expect(collapsed).toBeInTheDocument();
    fireEvent.click(screen.getByText("展开"));
    expect(screen.getByText(long)).toBeInTheDocument();
  });

  it("原始数据切换:显示完整 JSON,可返回", () => {
    render(
      <AuditDiffList
        before={snap({ name: "旧名" })}
        after={snap({ name: "新名" })}
        changedFields={["name"]}
      />,
    );

    fireEvent.click(screen.getByText("查看原始数据"));
    expect(screen.getByText(/旧名/)).toBeInTheDocument();
    expect(screen.getByText(/新名/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("返回格式化视图"));
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("空 diff:无变更数据占位", () => {
    render(<AuditDiffList before={snap(null)} after={snap(null)} changedFields={null} />);
    expect(screen.getByText(/无变更数据/)).toBeInTheDocument();
  });
});
