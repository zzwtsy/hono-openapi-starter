import type { PermissionRef, Role } from "@/api/globals";
import type { PermissionCode } from "@/types/permissions";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { useMemo, useState } from "react";
import Apis from "@/api";
import { useCan, useCanAll } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { groupByResource } from "../../../lib/group-by-resource";
import { IAM_ACTIONS, refreshIam } from "../../../lib/iam-actions";

function useRolePermissionData(role: Role, canRead: boolean) {
  const permissions = useRequest(() => Apis.IAM.listPermissions(), { immediate: canRead });
  const granted = useRequest(
    () => Apis.IAM.listRolePermissions({ pathParams: { roleId: role.id } }),
    { immediate: canRead, middleware: actionDelegationMiddleware(IAM_ACTIONS.rolePerms) },
  );
  return { permissions, granted };
}

function useAffectedRoleUsers(role: Role) {
  return useRequest(
    () => Apis.IAM.listRoleUsers({ pathParams: { roleId: role.id } }),
    { immediate: false, middleware: actionDelegationMiddleware(IAM_ACTIONS.roleUsers) },
  );
}

function filterPermissions(allPerms: PermissionRef[] | undefined, search: string, editing: boolean, viewMode: "all" | "selected" | "diff", working: Set<PermissionCode>, initial: Set<PermissionCode>): PermissionRef[] {
  const query = search.trim().toLowerCase();
  let filtered = query === ""
    ? (allPerms ?? [])
    : (allPerms ?? []).filter(permission => [permission.code, permission.label, permission.resourceLabel].some(value => value.toLowerCase().includes(query)));
  if (!editing || viewMode === "selected") {
    filtered = filtered.filter(permission => working.has(permission.code));
  } else if (viewMode === "diff") {
    filtered = filtered.filter(permission => working.has(permission.code) !== initial.has(permission.code));
  }
  return filtered;
}

/**
 * 角色权限编辑态:权限目录 + 已授 + diff 编辑 + 保存。
 *
 * prevInitial 保留:granted 刷新(submit 成功 / refresh)后重置 working 编辑态
 * (role 切换由容器 key={role.id} remount 处理),React 官方 adjusting-state 模式。
 */
export function useRolePermissions(role: Role, isSystemRootUser: boolean) {
  const canRead = useCanAll(["permissions.read", "roles.read"]);
  const hasAssignPermission = useCan("roles.assign-permissions");
  const hasRevokePermission = useCan("roles.revoke-permissions");
  const canReadAssignments = useCan("assignments.read");
  const canAssign = isSystemRootUser && hasAssignPermission;
  const canRevoke = isSystemRootUser && hasRevokePermission;
  const canEdit = role.source === "instance" && (canAssign || canRevoke);
  const { permissions, granted: grantedRequest } = useRolePermissionData(role, canRead);
  const { data: allPerms, loading: permsLoading, error: permsError, send: sendPerms } = permissions;
  const { data: granted, loading: grantedLoading, error: grantedError, send: sendGranted } = grantedRequest;
  const loading = permsLoading || grantedLoading;
  const error = permsError ?? grantedError;
  const initial = useMemo(() => new Set(granted?.map(permission => permission.code) ?? []), [granted]);
  const [working, setWorking] = useState<Set<PermissionCode>>(() => new Set(initial));
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "selected" | "diff">("all");
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setWorking(new Set(initial));
  }
  const toAdd = useMemo(() => [...working].filter(p => !initial.has(p)), [working, initial]);
  const toRemove = useMemo(() => [...initial].filter(p => !working.has(p)), [working, initial]);
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;
  const canChange = (permissionCode: PermissionCode, target: boolean): boolean => {
    if (!canEdit || !editing) {
      return false;
    }
    const baseline = initial.has(permissionCode);
    return target === baseline || (target ? canAssign : canRevoke);
  };
  const filtered = useMemo(() => filterPermissions(allPerms, search, editing, viewMode, working, initial), [allPerms, search, editing, viewMode, working, initial]);
  const groups = useMemo(() => groupByResource(filtered, p => p.resourceCode), [filtered]);

  const toggle = (permissionCode: PermissionCode) => {
    setWorking((prev) => {
      const next = new Set(prev);
      const target = !next.has(permissionCode);
      if (!canChange(permissionCode, target)) {
        return prev;
      }
      if (target) {
        next.add(permissionCode);
      } else {
        next.delete(permissionCode);
      }
      return next;
    });
  };
  const toggleAllInGroup = (perms: PermissionRef[], select: boolean) => {
    setWorking((prev) => {
      if (!canEdit || !editing) {
        return prev;
      }
      const next = new Set(prev);
      for (const p of perms) {
        if (!canChange(p.code, select)) {
          continue;
        }
        if (select) {
          next.add(p.code);
        } else {
          next.delete(p.code);
        }
      }
      return next;
    });
  };
  const retry = () => {
    void sendPerms();
    void sendGranted();
  };
  const { mutate: runWithToast, busy: submitting } = useToastMutation();
  const {
    data: affectedUsers,
    loading: affectedUsersLoading,
    error: affectedUsersError,
    send: loadAffectedUsers,
  } = useAffectedRoleUsers(role);
  const beginEdit = () => {
    if (!canEdit) {
      return;
    }
    setWorking(new Set(initial));
    setViewMode("all");
    setEditing(true);
    if (canReadAssignments) {
      void loadAffectedUsers();
    }
  };
  const cancelEdit = () => {
    setWorking(new Set(initial));
    setViewMode("selected");
    setEditing(false);
  };
  const submit = async () => {
    if (!canEdit || !editing || !hasChanges || submitting) {
      return;
    }
    const ok = await runWithToast(
      async () => {
        await Apis.IAM.updateRolePermissions({
          pathParams: { roleId: role.id },
          data: { addPermissionCodes: toAdd, removePermissionCodes: toRemove },
        });
      },
      { successMessage: `已更新:授予 ${toAdd.length},撤销 ${toRemove.length}`, errorMessage: "操作失败" },
    );
    if (ok) {
      setEditing(false);
      refreshIam(IAM_ACTIONS.rolePerms, IAM_ACTIONS.userPermissions, IAM_ACTIONS.authorization);
    }
  };

  return {
    canRead,
    canEdit,
    canReadAssignments,
    canAssign,
    canRevoke,
    canChange,
    allPerms,
    loading,
    error,
    initial,
    working,
    editing,
    beginEdit,
    cancelEdit,
    search,
    setSearch,
    viewMode,
    setViewMode,
    groups,
    toAdd,
    toRemove,
    hasChanges,
    toggle,
    toggleAllInGroup,
    retry,
    submit,
    submitting,
    affectedUsers,
    affectedUsersLoading,
    affectedUsersError,
    loadAffectedUsers,
  };
}
