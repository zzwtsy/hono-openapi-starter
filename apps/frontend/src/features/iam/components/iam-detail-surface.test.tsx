import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IamDetailSurface } from "./iam-detail-surface";

describe("IamDetailSurface", () => {
  it("桌面将状态归入标题区域，操作单独放入 CardAction", () => {
    render(
      <IamDetailSurface
        mode="card"
        title="测试角色"
        status={<Badge>实例</Badge>}
        actions={<Button>编辑</Button>}
      >
        <div>详情</div>
      </IamDetailSurface>,
    );

    const status = screen.getByText("实例");
    const action = screen.getByRole("button", { name: "编辑" });

    expect(status.parentElement).toContainElement(screen.getByText("测试角色"));
    expect(status.closest("[data-slot=card-action]")).toBeNull();
    expect(action.closest("[data-slot=card-action]")).not.toBeNull();
  });

  it("sheet 同样将状态放在标题旁边", () => {
    render(
      <IamDetailSurface mode="sheet" title="Admin" status={<Badge>正常</Badge>}>
        <div>详情</div>
      </IamDetailSurface>,
    );

    expect(screen.getByText("正常").parentElement).toContainElement(screen.getByRole("heading", { name: "Admin" }));
  });
});
