import type { Permission, Role } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { useMemo, useState } from "react";
import Apis from "@/api";
import { useCanAll } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { groupByResource } from "../../../lib/group-by-resource";
import { IAM_ACTIONS, refreshIam } from "../../../model/iam-actions";

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
  const initial = useMemo(() => new Set(granted ?? []), [granted]);

  const [working, setWorking] = useState<Set<string>>(() => new Set(initial));
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
        p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
      );
    }
    if (viewMode === "selected") {
      list = list.filter(p => working.has(p.name));
    } else if (viewMode === "diff") {
      list = list.filter(p => working.has(p.name) !== initial.has(p.name));
    }
    return list;
  }, [allPerms, search, viewMode, working, initial]);
  const groups = useMemo(() => groupByResource(filtered, p => p.name), [filtered]);

  const toggle = (name: string) => {
    setWorking((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleAllInGroup = (perms: Permission[], select: boolean) => {
    setWorking((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (select) {
          next.add(p.name);
        } else {
          next.delete(p.name);
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
            data: { permissions: toAdd },
          });
        }
        for (const p of toRemove) {
          await Apis.IAM.deleteRolePermission({ pathParams: { roleId: role.id, permission: p } });
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
