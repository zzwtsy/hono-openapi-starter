import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Can } from "./Can";

const { usePermissionsMock } = vi.hoisted(() => ({ usePermissionsMock: vi.fn() }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: usePermissionsMock }));

describe("Can", () => {
  beforeEach(() => {
    usePermissionsMock.mockReset();
  });

  it("permission:有权限渲染 children", () => {
    usePermissionsMock.mockReturnValue(["organizations.create"]);
    render(<Can permission="organizations.create"><span>新建</span></Can>);
    expect(screen.getByText("新建")).toBeInTheDocument();
  });

  it("permission:无权限默认隐藏", () => {
    usePermissionsMock.mockReturnValue([]);
    const { container } = render(<Can permission="organizations.create"><span>新建</span></Can>);
    expect(container.firstChild).toBeNull();
  });

  it("permission:无权限渲染 fallback 而非 children", () => {
    usePermissionsMock.mockReturnValue([]);
    render(
      <Can permission="organizations.create" fallback={<span>无权限</span>}>
        <span>新建</span>
      </Can>,
    );
    expect(screen.getByText("无权限")).toBeInTheDocument();
    expect(screen.queryByText("新建")).not.toBeInTheDocument();
  });

  it("anyOf:持任一权限即渲染(OR)", () => {
    usePermissionsMock.mockReturnValue(["projects.update"]);
    render(<Can anyOf={["projects.update", "projects.delete"]}><span>操作</span></Can>);
    expect(screen.getByText("操作")).toBeInTheDocument();
  });

  it("anyOf:全无则隐藏", () => {
    usePermissionsMock.mockReturnValue([]);
    const { container } = render(<Can anyOf={["projects.update", "projects.delete"]}><span>操作</span></Can>);
    expect(container.firstChild).toBeNull();
  });

  it("allOf:持全部权限才渲染(AND)", () => {
    usePermissionsMock.mockReturnValue(["roles.assign-permissions", "roles.revoke-permissions"]);
    render(<Can allOf={["roles.assign-permissions", "roles.revoke-permissions"]}><span>管理</span></Can>);
    expect(screen.getByText("管理")).toBeInTheDocument();
  });

  it("allOf:缺一则隐藏", () => {
    usePermissionsMock.mockReturnValue(["roles.assign-permissions"]);
    const { container } = render(<Can allOf={["roles.assign-permissions", "roles.revoke-permissions"]}><span>管理</span></Can>);
    expect(container.firstChild).toBeNull();
  });

  it("render-prop:children 为函数时传 allowed(disable 模式)", () => {
    usePermissionsMock.mockReturnValue([]);
    render(
      <Can permission="organizations.create">
        {({ allowed }) => <button disabled={!allowed}>新建</button>}
      </Can>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
