import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IamWorkbench } from "./iam-workbench";

const { useMediaQueryMock } = vi.hoisted(() => ({ useMediaQueryMock: vi.fn() }));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: useMediaQueryMock }));

function renderWorkbench(detailsOpen: boolean, onDetailsOpenChange = vi.fn()) {
  const renderDetail = vi.fn((mode: "card" | "sheet") => <div data-testid={`detail-${mode}`}>{mode}</div>);
  const result = render(
    <IamWorkbench
      title="角色管理"
      description="管理角色。"
      navigation={<div>角色导航</div>}
      detailsOpen={detailsOpen}
      onDetailsOpenChange={onDetailsOpenChange}
      sheetTitle="角色详情"
      sheetDescription="查看所选角色。"
      renderDetail={renderDetail}
    />,
  );
  return { ...result, renderDetail };
}

describe("IamWorkbench", () => {
  beforeEach(() => {
    useMediaQueryMock.mockReset();
  });

  it("桌面只挂载 card 详情", () => {
    useMediaQueryMock.mockReturnValue(true);
    const { renderDetail } = renderWorkbench(false);

    expect(screen.getByTestId("detail-card")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
    expect(renderDetail).toHaveBeenCalledTimes(1);
    expect(renderDetail).toHaveBeenCalledWith("card");
  });

  it("窄屏仅在 Sheet 打开时挂载 sheet 详情并提供可访问标题", () => {
    useMediaQueryMock.mockReturnValue(false);
    const { rerender, renderDetail } = renderWorkbench(false);
    expect(renderDetail).not.toHaveBeenCalled();

    rerender(
      <IamWorkbench
        title="角色管理"
        description="管理角色。"
        navigation={<div>角色导航</div>}
        detailsOpen
        onDetailsOpenChange={vi.fn()}
        sheetTitle="角色详情"
        sheetDescription="查看所选角色。"
        renderDetail={renderDetail}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("角色详情")).toBeInTheDocument();
    expect(screen.getByText("查看所选角色。")).toBeInTheDocument();
    expect(screen.getByTestId("detail-sheet")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-card")).not.toBeInTheDocument();
  });

  it("关闭 Sheet 不移除导航中的选择状态", () => {
    useMediaQueryMock.mockReturnValue(false);
    const onDetailsOpenChange = vi.fn();
    renderWorkbench(true, onDetailsOpenChange);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onDetailsOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(screen.getByText("角色导航")).toBeInTheDocument();
  });
});
