import type { PermissionRef, Role } from "@/api/globals";
import type { PermissionCode } from "@/types/permissions";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { useMemo, useState } from "react";
import Apis from "@/api";
import { useCanAll } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { groupByResource } from "../../../lib/group-by-resource";
import { IAM_ACTIONS, refreshIam } from "../../../lib/iam-actions";

/**
 * 角色权限编辑态:权限目录 + 已授 + diff 编辑 + 保存。
 *
 * 从 RolePermissionsTab 抽出,消函数级超标([code-style §4])。
 * prevInitial 保留:granted 刷新(submit 成功 / refresh)后重置 working 编辑态
 * (role 切换由容器 key={role.id} remount 处理),React 官方 adjusting-state 模式。
 */
export function useRolePermissions(role: Role) {
  const canConfig = useCanAll([
    "roles.assign-permissions",
    "roles.revoke-permissions",
    "permissions.read",
    "roles.read",
  ]);
  const { data: allPerms, loading: permsLoading, error: permsError, send: sendPerms } = useRequest(() => Apis.IAM.listPermissions(), { immediate: canConfig });
  const {
    data: granted,
    loading: grantedLoading,
    error: grantedError,
    send: sendGranted,
  } = useRequest(
    () => Apis.IAM.listRolePermissions({ pathParams: { roleId: role.id } }),
    { immediate: canConfig, middleware: actionDelegationMiddleware(IAM_ACTIONS.rolePerms) },
  );
  const loading = permsLoading || grantedLoading;
  const error = permsError ?? grantedError;
  const initial = useMemo(() => new Set(granted?.map(permission => permission.code) ?? []), [granted]);

  const [working, setWorking] = useState<Set<PermissionCode>>(() => new Set(initial));
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allPerms ?? [];
    if (q !== "") {
      list = list.filter(
        p => p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || p.resourceLabel.toLowerCase().includes(q),
      );
    }
    if (viewMode === "selected") {
      list = list.filter(p => working.has(p.code));
    } else if (viewMode === "diff") {
      list = list.filter(p => working.has(p.code) !== initial.has(p.code));
    }
    return list;
  }, [allPerms, search, viewMode, working, initial]);
  const groups = useMemo(() => groupByResource(filtered, p => p.resourceCode), [filtered]);

  const toggle = (permissionCode: PermissionCode) => {
    setWorking((prev) => {
      const next = new Set(prev);
      if (next.has(permissionCode)) {
        next.delete(permissionCode);
      } else {
        next.add(permissionCode);
      }
      return next;
    });
  };

  const toggleAllInGroup = (perms: PermissionRef[], select: boolean) => {
    setWorking((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
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
  const submit = async () => {
    if (!hasChanges || submitting) {
      return;
    }
    const ok = await runWithToast(
      async () => {
        if (toAdd.length > 0) {
          await Apis.IAM.assignRolePermissions({
            pathParams: { roleId: role.id },
            data: { permissionCodes: toAdd },
          });
        }
        for (const p of toRemove) {
          await Apis.IAM.deleteRolePermission({ pathParams: { roleId: role.id, permissionCode: p } });
        }
      },
      { successMessage: `已更新:授予 ${toAdd.length},撤销 ${toRemove.length}`, errorMessage: "操作失败" },
    );
    if (ok) {
      refreshIam(IAM_ACTIONS.rolePerms, IAM_ACTIONS.userPermissions);
    }
  };

  return {
    canConfig,
    allPerms,
    loading,
    error,
    initial,
    working,
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
  };
}
