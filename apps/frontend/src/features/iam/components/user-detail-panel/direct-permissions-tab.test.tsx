import type { PermissionCode } from "@/types/permissions";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectPermissionsTab } from "./direct-permissions-tab";

const { assignUserPermissionMock, useRequestMock, useCapabilitiesMock, mutateMock, refreshIamMock } = vi.hoisted(() => ({
  assignUserPermissionMock: vi.fn(),
  useRequestMock: vi.fn(),
  useCapabilitiesMock: vi.fn(),
  mutateMock: vi.fn(),
  refreshIamMock: vi.fn(),
}));

vi.mock("@/api", () => ({ default: { IAM: { listPermissions: vi.fn(), assignUserPermission: assignUserPermissionMock, deleteUserPermission: vi.fn() } } }));
vi.mock("alova/client", () => ({ useRequest: useRequestMock }));
vi.mock("../../hooks/use-iam-capabilities", () => ({ useIamUserCapabilities: useCapabilitiesMock }));
vi.mock("../../lib/iam-actions", () => ({ IAM_ACTIONS: { userDirectPerms: "direct", userPermissions: "effective", authorization: "authorization" }, refreshIam: refreshIamMock }));
vi.mock("@/hooks/use-toast-mutation", () => ({ useToastMutation: () => ({ mutate: mutateMock, busy: false }) }));
vi.mock("../permission-combobox", () => ({
  PermissionCombobox: ({ value, onChange, disabled }: { value: string | null; onChange: (value: PermissionCode) => void; disabled: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => { onChange("users.read"); }}>{value ?? "选择权限"}</button>
  ),
}));
vi.mock("@/components/shared/date-picker", () => ({
  DatePicker: ({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) => (
    <button type="button" onClick={() => { onChange(null); }}>{value ?? "永不过期"}</button>
  ),
}));

const emptyQuery = { data: [], loading: false, error: null, retry: vi.fn() };

function renderTab() {
  return render(
    <DirectPermissionsTab
      userId="user-1"
      userName="张三"
      userHomeOrgId="org-1"
      orgId="org-1"
      orgPath="总部 / 研发部"
      currentUserId="current-user"
      query={emptyQuery}
      effectiveResult={{
        effective: [{ permission: { code: "users.read", label: "查看用户", resourceCode: "users", resourceLabel: "用户", actionCode: "read" }, sources: [{ type: "role", roleId: "role-1", roleName: "审计员", orgId: "org-1", expiresAt: null }] }],
        denied: [],
      }}
    />,
  );
}

describe("DirectPermissionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCapabilitiesMock.mockReturnValue({ canGrantDirectPermissions: true, canRevokeAssignments: true });
    useRequestMock.mockReturnValue({ data: [{ code: "users.read", label: "查看用户", resourceCode: "users", resourceLabel: "用户" }] });
    assignUserPermissionMock.mockResolvedValue({});
    mutateMock.mockImplementation(async (fn: () => Promise<unknown>) => {
      await fn();
      return true;
    });
  });

  it("deny 状态直接显示受影响角色并提交正确 payload", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "添加例外规则" }));
    fireEvent.click(screen.getByRole("button", { name: "选择权限" }));
    fireEvent.click(screen.getByRole("button", { name: "拒绝" }));

    expect(screen.getByRole("alert")).toHaveTextContent("审计员");
    fireEvent.click(screen.getByRole("button", { name: /保存规则/ }));

    await waitFor(() => {
      expect(assignUserPermissionMock).toHaveBeenCalledWith({
        pathParams: { userId: "user-1", permissionCode: "users.read" },
        data: { orgId: "org-1", effect: "deny", expiresAt: undefined },
      });
    });
    expect(refreshIamMock).toHaveBeenCalled();
  });

  it("保存失败时保留 Dialog 输入", async () => {
    mutateMock.mockResolvedValue(false);
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "添加例外规则" }));
    fireEvent.click(screen.getByRole("button", { name: "选择权限" }));
    fireEvent.click(screen.getByRole("button", { name: /保存规则/ }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalled();
    });
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "users.read" })).toBeVisible();
  });

  it("无授予能力时隐藏入口且 catalog 请求保持禁用", () => {
    useCapabilitiesMock.mockReturnValue({ canGrantDirectPermissions: false, canRevokeAssignments: false });
    renderTab();

    expect(screen.queryByRole("button", { name: "添加例外规则" })).not.toBeInTheDocument();
    expect(useRequestMock.mock.calls[0]?.[1]).toMatchObject({ immediate: false });
  });
});
