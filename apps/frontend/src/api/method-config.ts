import { withConfigType } from "./createApis";

/**
 * 生成 API 的 method 级策略。
 *
 * GET 统一声明 cacheFor / hitSource，mutation 统一声明 name；调用方无需重复配置。
 */
export const $$userConfigMap = withConfigType({
  // 授权或自助资料变更后删缓存；当前 SPA context 需下次 beforeLoad 才读取新权限。
  "Me.getMe": {
    cacheFor: 5 * 60_000,
    hitSource: [
      "IAM.assignUserRole",
      "IAM.deleteUserRole",
      "IAM.assignUserPermission",
      "IAM.deleteUserPermission",
      "IAM.assignRolePermissions",
      "IAM.updateRolePermissions",
      "IAM.deleteRolePermission",
      "Me.updateMe",
    ],
  },
  "IAM.listRoles": {
    cacheFor: 60_000,
    hitSource: ["IAM.createRole", "IAM.updateRole", "IAM.deleteRole"],
  },
  "IAM.listPermissions": { cacheFor: 10 * 60_000 },
  "IAM.getTargetCapabilities": {
    cacheFor: 60_000,
    hitSource: [
      "IAM.assignUserRole",
      "IAM.deleteUserRole",
      "IAM.assignUserPermission",
      "IAM.deleteUserPermission",
      "IAM.assignRolePermissions",
      "IAM.updateRolePermissions",
      "IAM.deleteRolePermission",
    ],
  },
  "IAM.listRolePermissions": {
    hitSource: ["IAM.assignRolePermissions", "IAM.updateRolePermissions", "IAM.deleteRolePermission"],
  },
  "IAM.listOrganizations": {
    cacheFor: 60_000,
    hitSource: ["IAM.createOrganization", "IAM.updateOrganization", "IAM.deleteOrganization"],
  },
  // 重置密码不改变列表字段，因此不触发用户列表失效。
  "IAM.listUsers": {
    cacheFor: 60_000,
    hitSource: ["IAM.createUser", "IAM.updateUser", "IAM.disableUser", "IAM.enableUser", "Me.updateMe"],
  },
  // 角色权限变化也会改变用户有效权限，必须沿角色 -> 权限 -> 用户链路失效。
  "IAM.listUserPermissions": {
    cacheFor: 60_000,
    hitSource: [
      "IAM.assignUserRole",
      "IAM.deleteUserRole",
      "IAM.assignUserPermission",
      "IAM.deleteUserPermission",
      "IAM.assignRolePermissions",
      "IAM.updateRolePermissions",
      "IAM.deleteRolePermission",
    ],
  },
  "IAM.listUserRoles": {
    cacheFor: 60_000,
    hitSource: ["IAM.assignUserRole", "IAM.deleteUserRole"],
  },
  "IAM.listUserDirectPermissions": {
    cacheFor: 60_000,
    hitSource: ["IAM.assignUserPermission", "IAM.deleteUserPermission"],
  },
  "Settings.listSettings": {
    cacheFor: 60_000,
    hitSource: ["Settings.updateSetting"],
  },
  "Projects.listProjects": {
    cacheFor: 60_000,
    hitSource: ["Projects.createProject", "Projects.updateProject", "Projects.deleteProject"],
  },
  "Projects.createProject": { name: "Projects.createProject" },
  "Projects.updateProject": { name: "Projects.updateProject" },
  "Projects.deleteProject": { name: "Projects.deleteProject" },
  "IAM.createRole": { name: "IAM.createRole" },
  "IAM.updateRole": { name: "IAM.updateRole" },
  "IAM.deleteRole": { name: "IAM.deleteRole" },
  "IAM.assignRolePermissions": { name: "IAM.assignRolePermissions" },
  "IAM.updateRolePermissions": { name: "IAM.updateRolePermissions" },
  "IAM.deleteRolePermission": { name: "IAM.deleteRolePermission" },
  "IAM.createOrganization": { name: "IAM.createOrganization" },
  "IAM.updateOrganization": { name: "IAM.updateOrganization" },
  "IAM.deleteOrganization": { name: "IAM.deleteOrganization" },
  "IAM.assignUserRole": { name: "IAM.assignUserRole" },
  "IAM.deleteUserRole": { name: "IAM.deleteUserRole" },
  "IAM.assignUserPermission": { name: "IAM.assignUserPermission" },
  "IAM.deleteUserPermission": { name: "IAM.deleteUserPermission" },
  "IAM.createUser": { name: "IAM.createUser" },
  "IAM.updateUser": { name: "IAM.updateUser" },
  "IAM.resetUserPassword": { name: "IAM.resetUserPassword" },
  "IAM.disableUser": { name: "IAM.disableUser" },
  "IAM.enableUser": { name: "IAM.enableUser" },
  "Settings.updateSetting": { name: "Settings.updateSetting" },
  // action 目录静态缓存；日志列表与资源时间线保持实时。
  "Audit.listAuditActions": { cacheFor: Infinity },
  "Audit.listAuditLogs": { cacheFor: 0 },
  "Audit.listAuditLogsByResource": { cacheFor: 0 },
});
