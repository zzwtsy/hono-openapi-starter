import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Can } from "./Can";

const useCanMock = vi.fn();

// mock useCan,避免 RouterProvider 样板;仍渲染真实 Can 分支。
vi.mock("@/hooks/use-permissions", () => ({
  useCan: (perm: string): boolean => useCanMock(perm) as boolean,
}));

describe("Can", () => {
  beforeEach(() => {
    useCanMock.mockReset();
  });

  it("useCan 为 true 时渲染 children", () => {
    useCanMock.mockReturnValue(true);
    render(
      <Can perm="users.read">
        <span>visible</span>
      </Can>,
    );
    expect(screen.getByText("visible")).toBeInTheDocument();
    expect(useCanMock).toHaveBeenCalledWith("users.read");
  });

  it("useCan 为 false 时不渲染 children", () => {
    useCanMock.mockReturnValue(false);
    const { container } = render(
      <Can perm="users.create">
        <span>hidden</span>
      </Can>,
    );
    expect(screen.queryByText("hidden")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});
