import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PermissionGroupLayout } from "./permission-group-layout";

describe("PermissionGroupLayout", () => {
  it.for([
    { maxColumns: 2 as const, expected: ["columns-1", "xl:columns-2"], unexpected: "2xl:columns-3" },
    { maxColumns: 3 as const, expected: ["columns-1", "xl:columns-2", "2xl:columns-3"], unexpected: undefined },
  ])("支持最多 $maxColumns 列的响应式分组", ({ maxColumns, expected, unexpected }) => {
    render(<PermissionGroupLayout maxColumns={maxColumns}>权限分组</PermissionGroupLayout>);

    const layout = screen.getByText("权限分组");
    expect(layout).toHaveAttribute("data-max-columns", String(maxColumns));
    expect(layout).toHaveClass(...expected);
    if (unexpected !== undefined) {
      expect(layout).not.toHaveClass(unexpected);
    }
  });
});
