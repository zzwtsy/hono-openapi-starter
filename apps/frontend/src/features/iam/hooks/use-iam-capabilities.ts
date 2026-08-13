import type { PermissionCode } from "@/types/permissions";
import { useWatcher } from "alova/client";
import Apis from "@/api";
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

export function useTargetCapabilities(orgId: string) {
  return useWatcher(
    () => Apis.IAM.getTargetCapabilities({ params: { orgId } }),
    [orgId],
    { immediate: orgId !== "" },
  );
}

export function useIamUserCapabilities(
  currentUserId: string,
  targetUserId: string,
  homeOrgId: string,
  grantOrgId: string,
): IamUserCapabilities {
  const home = useTargetCapabilities(homeOrgId).data?.permissionCodes;
  const grant = useTargetCapabilities(grantOrgId).data?.permissionCodes;
  const global = usePermissions();
  const atBoth = (permissionCode: PermissionCode) =>
    hasPermission(home, permissionCode) && hasPermission(grant, permissionCode);

  return {
    canReadAssignments: atBoth("assignments.read"),
    canGrantRoleAssignments: atBoth("assignments.grant") && hasPermission(global, "roles.read"),
    canGrantDirectPermissions: atBoth("assignments.grant") && hasPermission(global, "permissions.read"),
    canRevokeAssignments: atBoth("assignments.revoke") && currentUserId !== targetUserId,
    canReadRoles: hasPermission(global, "roles.read"),
    canReadPermissions: hasPermission(global, "permissions.read"),
  };
}
