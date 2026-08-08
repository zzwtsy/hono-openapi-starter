import { defineAuditAction } from "@/core/audit/action.js";

/** IAM feature 的审计动作定义。路由与 audit catalog 共用这些 descriptor。 */
export const iamAuditActions = {
  roleCreate: defineAuditAction("iam.role.create", "创建角色"),
  roleUpdate: defineAuditAction("iam.role.update", "修改角色"),
  roleDelete: defineAuditAction("iam.role.delete", "删除角色"),
  roleAssignPermissions: defineAuditAction("iam.role.assign_permissions", "给角色配权限"),
  roleUpdatePermissions: defineAuditAction("iam.role.update_permissions", "批量更新角色权限"),
  roleRevokePermission: defineAuditAction("iam.role.revoke_permission", "撤角色权限"),
  userCreate: defineAuditAction("iam.user.create", "创建用户"),
  userUpdate: defineAuditAction("iam.user.update", "修改用户资料"),
  userResetPassword: defineAuditAction("iam.user.reset_password", "重置密码"),
  userDisable: defineAuditAction("iam.user.disable", "禁用用户"),
  userEnable: defineAuditAction("iam.user.enable", "启用用户"),
  userTransferOrg: defineAuditAction("iam.user.transfer_org", "用户调岗"),
  assignmentGrantRole: defineAuditAction("iam.assignment.grant_role", "授用户角色"),
  assignmentRevokeRole: defineAuditAction("iam.assignment.revoke_role", "撤用户角色"),
  assignmentGrantPermission: defineAuditAction("iam.assignment.grant_permission", "授用户权限"),
  assignmentRevokePermission: defineAuditAction("iam.assignment.revoke_permission", "撤用户权限"),
  orgCreate: defineAuditAction("iam.org.create", "创建组织"),
  orgUpdate: defineAuditAction("iam.org.update", "修改组织"),
  orgDelete: defineAuditAction("iam.org.delete", "删除组织"),
} as const;
