import type { PermissionCode } from "@/types/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { hasPermission } from "@/lib/permissions";

interface IamUserCapabilityArgs {
  currentUserId: string;
  targetUserId: string;
}

export interface IamUserCapabilities {
  canReadAssignments: boolean;
  canGrantRoleAssignments: boolean;
  canGrantDirectPermissions: boolean;
  canRevokeAssignments: boolean;
  canReadRoles: boolean;
  canReadPermissions: boolean;
}

/** 用户 IAM 页面能力矩阵的纯函数；后端仍是最终授权边界。 */
export function getIamUserCapabilities(
  permissionCodes: readonly PermissionCode[] | undefined,
  { currentUserId, targetUserId }: IamUserCapabilityArgs,
): IamUserCapabilities {
  const canReadAssignments = hasPermission(permissionCodes, "assignments.read");
  const canReadRoles = hasPermission(permissionCodes, "roles.read");
  const canReadPermissions = hasPermission(permissionCodes, "permissions.read");
  const canGrant = hasPermission(permissionCodes, "assignments.grant");
  const canRevoke = hasPermission(permissionCodes, "assignments.revoke");

  return {
    canReadAssignments,
    canGrantRoleAssignments: canGrant && canReadRoles,
    canGrantDirectPermissions: canGrant && canReadPermissions,
    canRevokeAssignments: canRevoke && currentUserId !== targetUserId,
    canReadRoles,
    canReadPermissions,
  };
}

export function useIamUserCapabilities(currentUserId: string, targetUserId: string): IamUserCapabilities {
  return getIamUserCapabilities(usePermissions(), { currentUserId, targetUserId });
}
