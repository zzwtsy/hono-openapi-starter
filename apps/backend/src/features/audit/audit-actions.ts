/**
 * 审计 action 目录:action 代码 -> 中文 label 映射。
 *
 * 阶段 2 手写 catalog(覆盖阶段 3 将埋点的所有 action);阶段 3 埋点时各 feature 的 audit() 配置
 * 必须与此处 action/label 对齐。前端经 `GET /audit-logs/actions` 取此目录,渲染时查表展示 label。
 *
 * 后端是 action label 单一事实来源,前端不维护第二份映射(对齐权限 resourceLabel 模式)。
 */
export const auditActionCatalog = [
  // IAM - 角色
  { action: "iam.role.create", label: "创建角色" },
  { action: "iam.role.update", label: "修改角色" },
  { action: "iam.role.delete", label: "删除角色" },
  { action: "iam.role.assign_permissions", label: "给角色配权限" },
  { action: "iam.role.revoke_permission", label: "撤角色权限" },
  // IAM - 用户
  { action: "iam.user.create", label: "创建用户" },
  { action: "iam.user.update", label: "修改用户资料" },
  { action: "iam.user.reset_password", label: "重置密码" },
  { action: "iam.user.disable", label: "禁用用户" },
  { action: "iam.user.enable", label: "启用用户" },
  { action: "iam.user.transfer_org", label: "用户调岗" },
  // IAM - 授权
  { action: "iam.assignment.grant_role", label: "授用户角色" },
  { action: "iam.assignment.revoke_role", label: "撤用户角色" },
  { action: "iam.assignment.grant_permission", label: "授用户权限" },
  { action: "iam.assignment.revoke_permission", label: "撤用户权限" },
  // IAM - 组织
  { action: "iam.org.create", label: "创建组织" },
  { action: "iam.org.update", label: "修改组织" },
  { action: "iam.org.delete", label: "删除组织" },
  // Projects
  { action: "projects.create", label: "创建项目" },
  { action: "projects.update", label: "修改项目" },
  { action: "projects.delete", label: "删除项目" },
  // System Settings
  { action: "settings.update", label: "修改系统配置" },
  // Me
  { action: "me.update", label: "自助修改显示名" },
  { action: "me.change_password", label: "自助修改密码" },
  // Auth
  { action: "auth.sign-in", label: "登录" },
  { action: "auth.sign-out", label: "登出" },
] as const;
