import type { UserSummary } from "@/api/globals";
import { useMemo } from "react";

export const USER_DETAIL_TABS = ["overview", "access", "audit"] as const;
export type UserDetailTab = (typeof USER_DETAIL_TABS)[number];

export const USER_ACCESS_VIEWS = ["config", "effective"] as const;
export type UserAccessView = (typeof USER_ACCESS_VIEWS)[number];

/** 解析访问权限内部视图，并兼容旧的 roles/direct/effective 深链。 */
export function parseUserAccessView(value: unknown, legacyTab?: unknown): UserAccessView {
  if (value === "config" || value === "effective") {
    return value;
  }
  return legacyTab === "effective" ? "effective" : "config";
}

/** 兼容旧用户详情深链；新导航只写规范的三个 Tab 值。 */
export function parseUserDetailTab(value: unknown): UserDetailTab | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  if (value === "overview" || value === "info") {
    return "overview";
  }
  if (value === "access" || value === "roles" || value === "direct" || value === "effective") {
    return "access";
  }
  return value === "audit" ? "audit" : undefined;
}

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
  const activeTab = parseUserDetailTab(tab) ?? "overview";

  return { selectedUser, orgId, activeTab };
}
