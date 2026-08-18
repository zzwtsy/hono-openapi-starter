import type { UserDirectPermission, UserPermissionsResult, UserRoleAssignment } from "@/api/globals";
import { actionDelegationMiddleware, useWatcher } from "alova/client";
import Apis from "@/api";
import { IAM_ACTIONS } from "../lib/iam-actions";

export interface UserAccessQueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  retry: () => void;
}

export interface UserAccessData {
  roles: UserAccessQueryState<UserRoleAssignment[]>;
  directPermissions: UserAccessQueryState<UserDirectPermission[]>;
  effectivePermissions: UserAccessQueryState<UserPermissionsResult>;
}

/** 集中编排访问权限页的三个独立查询；任一失败不会阻塞其他区块。 */
export function useUserAccessData(userId: string, orgId: string, enabled: boolean): UserAccessData {
  const roles = useWatcher(
    () => Apis.IAM.listUserRoles({ pathParams: { userId }, params: { orgId } }),
    [userId, orgId],
    { immediate: enabled, middleware: actionDelegationMiddleware(IAM_ACTIONS.userRoles) },
  );
  const directPermissions = useWatcher(
    () => Apis.IAM.listUserDirectPermissions({ pathParams: { userId }, params: { orgId } }),
    [userId, orgId],
    { immediate: enabled, middleware: actionDelegationMiddleware(IAM_ACTIONS.userDirectPerms) },
  );
  const effectivePermissions = useWatcher(
    () => Apis.IAM.listUserPermissions({ pathParams: { userId }, params: { orgId } }),
    [userId, orgId],
    { immediate: enabled, middleware: actionDelegationMiddleware(IAM_ACTIONS.userPermissions) },
  );

  return {
    roles: {
      data: roles.data,
      loading: roles.loading,
      error: roles.error,
      retry: () => { void roles.send(); },
    },
    directPermissions: {
      data: directPermissions.data,
      loading: directPermissions.loading,
      error: directPermissions.error,
      retry: () => { void directPermissions.send(); },
    },
    effectivePermissions: {
      data: effectivePermissions.data,
      loading: effectivePermissions.loading,
      error: effectivePermissions.error,
      retry: () => { void effectivePermissions.send(); },
    },
  };
}
