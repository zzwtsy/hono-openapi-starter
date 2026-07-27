import type { Role } from "@/api/globals";
import { useMemo } from "react";

const TAB_VALUES = ["info", "permissions", "users"] as const;

interface UseRoleSelectionArgs {
  selectedRoleId?: string;
  roles?: Role[];
  tab?: string;
}

/**
 * 角色管理页的派生选择状态:选中角色(带 fallback 首条)、激活 tab。
 *
 * URL-driven:未指定 role 时 fallback 首条(派生,不写 URL)。
 * 从 routes 下放到 features/iam/hooks(route 保持薄,派生属业务)。
 * 风格同 use-user-page-state:纯派生 hook,不碰副作用/路由。
 */
export function useRoleSelection({ selectedRoleId, roles, tab }: UseRoleSelectionArgs) {
  const selectedRole = useMemo(
    () => roles?.find(r => r.id === selectedRoleId) ?? roles?.[0],
    [roles, selectedRoleId],
  );
  const activeTab = tab !== undefined && (TAB_VALUES as readonly string[]).includes(tab) ? tab : "info";

  return { selectedRole, activeTab };
}
