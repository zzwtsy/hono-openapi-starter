import type { UserSummary } from "@/api/globals";
import { useMemo } from "react";

const TAB_VALUES = ["info", "roles", "direct", "effective", "audit"] as const;

interface UseUserSelectionArgs {
  selectedUserId?: string;
  users?: UserSummary[];
  orgParam?: string;
  tab?: string;
  homeOrgId: string;
}

/**
 * 用户管理页的派生选择状态:选中用户(带 fallback 首条)、当前 orgId、激活 tab。
 *
 * URL-driven:未指定 user 时 fallback 首条(派生,不写 URL)。
 * 从 routes 下放到 features/iam/hooks(route 保持薄,派生属业务)。
 * 风格同 use-user-page-state:纯派生 hook,不碰副作用/路由。
 */
export function useUserSelection({ selectedUserId, users, orgParam, tab, homeOrgId }: UseUserSelectionArgs) {
  const selectedUser = useMemo(
    () => users?.find(u => u.id === selectedUserId) ?? users?.[0],
    [users, selectedUserId],
  );
  const orgId = orgParam ?? selectedUser?.orgId ?? homeOrgId;
  const activeTab = tab !== undefined && (TAB_VALUES as readonly string[]).includes(tab) ? tab : "info";

  return { selectedUser, orgId, activeTab };
}
