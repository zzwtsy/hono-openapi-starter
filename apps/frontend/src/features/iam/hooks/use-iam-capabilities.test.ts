import type { PermissionCode } from "@/types/permissions";
import { describe, expect, it } from "vitest";
import { getIamUserCapabilities } from "./use-iam-capabilities";

const allAssignmentPermissions: PermissionCode[] = [
  "assignments.read",
  "assignments.grant",
  "assignments.revoke",
  "roles.read",
  "permissions.read",
];

describe("getIamUserCapabilities", () => {
  it("把读、授予、撤销和选择器读权限拆开", () => {
    expect(getIamUserCapabilities(allAssignmentPermissions, { currentUserId: "u-1", targetUserId: "u-2" })).toEqual({
      canReadAssignments: true,
      canGrantRoleAssignments: true,
      canGrantDirectPermissions: true,
      canRevokeAssignments: true,
      canReadRoles: true,
      canReadPermissions: true,
    });
  });

  it("本人目标不开放撤销", () => {
    const capabilities = getIamUserCapabilities(allAssignmentPermissions, { currentUserId: "u-1", targetUserId: "u-1" });
    expect(capabilities.canReadAssignments).toBe(true);
    expect(capabilities.canRevokeAssignments).toBe(false);
  });

  it("只有查看权限时不产生授予能力", () => {
    const capabilities = getIamUserCapabilities(["assignments.read"], { currentUserId: "u-1", targetUserId: "u-2" });
    expect(capabilities.canReadAssignments).toBe(true);
    expect(capabilities.canGrantRoleAssignments).toBe(false);
    expect(capabilities.canGrantDirectPermissions).toBe(false);
    expect(capabilities.canRevokeAssignments).toBe(false);
  });
});
