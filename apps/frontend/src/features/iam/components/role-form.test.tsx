import type { ComponentProps } from "react";
import type { Role } from "@/api/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { http, okEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { RoleForm } from "./role-form";

const existingRole: Role = {
  id: "role-1",
  name: "viewer",
  description: "只读",
  source: "instance",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

function renderRoleForm(props: ComponentProps<typeof RoleForm>) {
  return render(
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <RoleForm {...props} />
      </DialogContent>
    </Dialog>,
  );
}

describe("RoleForm", () => {
  it("创建时发送表单值并在请求期间防止重复提交", async () => {
    let requestBody: unknown;
    let releaseResponse: (() => void) | undefined;
    let requestCount = 0;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    server.use(
      http.post("*/api/v1/roles", async ({ request }) => {
        requestCount += 1;
        requestBody = await request.json();
        await responseGate;
        return okEnvelope({ ...existingRole, name: "auditor", description: null });
      }),
    );
    const onSuccess = vi.fn();
    renderRoleForm({ onSuccess });
    fireEvent.change(screen.getByLabelText("名称"), { target: { value: "auditor" } });

    const button = screen.getByRole("button", { name: "创建" });
    fireEvent.submit(button.closest("form")!);

    await vi.waitFor(() => {
      expect(requestCount).toBe(1);
      expect(button).toBeDisabled();
    });
    fireEvent.click(button);
    expect(requestCount).toBe(1);

    releaseResponse?.();
    await vi.waitFor(() => {
      expect(requestBody).toEqual({ name: "auditor" });
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it("编辑时保留 id 路径并将空描述转换为 null", async () => {
    let requestBody: unknown;
    server.use(
      http.patch("*/api/v1/roles/role-1", async ({ request }) => {
        requestBody = await request.json();
        return okEnvelope({ ...existingRole, name: "reader", description: null });
      }),
    );
    const onSuccess = vi.fn();
    renderRoleForm({ role: existingRole, onSuccess });
    fireEvent.change(screen.getByLabelText("名称"), { target: { value: "reader" } });
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "" } });

    fireEvent.submit(screen.getByRole("button", { name: "保存" }).closest("form")!);

    await vi.waitFor(() => {
      expect(requestBody).toEqual({ name: "reader", description: null });
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it("名称失焦后显示可访问错误", async () => {
    renderRoleForm({ onSuccess: vi.fn() });
    const name = screen.getByLabelText("名称");

    fireEvent.blur(name);

    expect(await screen.findByRole("alert")).toHaveTextContent("请输入角色名");
    expect(name).toHaveAttribute("aria-invalid", "true");
  });

  it("无效提交显示未触碰字段错误、聚焦首项且不发送请求", async () => {
    let requestCount = 0;
    server.use(
      http.post("*/api/v1/roles", () => {
        requestCount += 1;
        return okEnvelope(existingRole);
      }),
    );
    renderRoleForm({ onSuccess: vi.fn() });
    const name = screen.getByLabelText("名称");

    fireEvent.submit(screen.getByRole("button", { name: "创建" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("请输入角色名");
    expect(name).toHaveAttribute("aria-invalid", "true");
    await vi.waitFor(() => {
      expect(name).toHaveFocus();
    });
    expect(requestCount).toBe(0);
  });
});
