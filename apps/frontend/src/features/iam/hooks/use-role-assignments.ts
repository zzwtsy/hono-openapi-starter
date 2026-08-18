import type { Role } from "@/api/globals";
import { actionDelegationMiddleware, useWatcher } from "alova/client";
import { useMemo, useState } from "react";
import Apis from "@/api";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { IAM_ACTIONS, refreshIam } from "../lib/iam-actions";
import { useIamUserCapabilities } from "./use-iam-capabilities";

interface UseRoleAssignmentsArgs {
  userId: string;
  userHomeOrgId: string;
  orgId: string;
  roles: Role[];
  currentUserId: string;
}

export function useRoleAssignments({ userId, userHomeOrgId, orgId, roles, currentUserId }: UseRoleAssignmentsArgs) {
  const {
    canReadAssignments,
    canGrantRoleAssignments: canGrant,
    canRevokeAssignments: canRevoke,
  } = useIamUserCapabilities(currentUserId, userId, userHomeOrgId, orgId);
  const {
    data: assignments,
    loading,
    error,
    send,
  } = useWatcher(
    () => Apis.IAM.listUserRoles({ pathParams: { userId }, params: { orgId } }),
    [orgId],
    { immediate: canReadAssignments, middleware: actionDelegationMiddleware(IAM_ACTIONS.userRoles) },
  );
  // 当前有效权限(与 EffectivePermissionsPanel 同 key,alova 自动共享缓存),用于授予预览
  const { data: effectiveResult } = useWatcher(
    () => Apis.IAM.listUserPermissions({ pathParams: { userId }, params: { orgId } }),
    [orgId],
    { immediate: canReadAssignments, middleware: actionDelegationMiddleware(IAM_ACTIONS.userPermissions) },
  );

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const { mutate: runWithToast, busy: assigning } = useToastMutation();

  // selectedRoleId 必须作为 watcher 依赖，确保预览请求始终使用当前选中的角色。
  const { data: previewPerms } = useWatcher(
    () => Apis.IAM.listRolePermissions({ pathParams: { roleId: selectedRoleId } }),
    [selectedRoleId],
    { immediate: false },
  );
  // 授予后将新增哪些权限(用户当前未持有)
  const newPerms = useMemo(() => {
    if (previewPerms === undefined || effectiveResult === undefined) {
      return undefined;
    }
    const have = new Set(effectiveResult.effective.map(p => p.permission.code));
    return previewPerms.filter(p => !have.has(p.code));
  }, [previewPerms, effectiveResult]);

  const roleItems = useMemo(() => [
    { label: "请选择角色...", value: null },
    ...roles.map(r => ({ label: r.name, value: r.id })),
  ], [roles]);

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userRoles, IAM_ACTIONS.userPermissions, IAM_ACTIONS.authorization);
  };

  const assignRole = async () => {
    if (selectedRoleId === "" || assigning) {
      return;
    }
    const ok = await runWithToast(
      () => Apis.IAM.assignUserRole({
        pathParams: { userId, roleId: selectedRoleId },
        data: { orgId, expiresAt: editingRoleId === null ? (expiresAt ?? undefined) : expiresAt },
      }),
      { successMessage: editingRoleId === null ? "角色已授予" : "角色授权已更新", errorMessage: "授权失败" },
    );
    if (ok) {
      setSelectedRoleId("");
      setExpiresAt(null);
      setEditingRoleId(null);
      refresh();
    }
  };

  const startEdit = (assignment: { roleId: string; expiresAt: string | null }) => {
    setEditingRoleId(assignment.roleId);
    setSelectedRoleId(assignment.roleId);
    setExpiresAt(assignment.expiresAt);
  };

  const cancelEdit = () => {
    setEditingRoleId(null);
    setSelectedRoleId("");
    setExpiresAt(null);
  };

  const revoke = async (roleId: string) => {
    const ok = await runWithToast(
      () => Apis.IAM.deleteUserRole({ pathParams: { userId, roleId }, params: { orgId } }),
      { successMessage: "角色已撤销", errorMessage: "撤销失败" },
    );
    if (ok) {
      refresh();
    }
  };

  return {
    canGrant,
    canRevoke,
    assignments,
    loading,
    error,
    send,
    selectedRoleId,
    setSelectedRoleId,
    expiresAt,
    setExpiresAt,
    editingRoleId,
    assigning,
    previewPerms,
    newPerms,
    roleItems,
    assignRole,
    startEdit,
    cancelEdit,
    revoke,
  };
}
