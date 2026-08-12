import { AssignmentService } from "./assignments/service.js";
import { OrganizationService } from "./organizations/service.js";
import { RoleService } from "./roles/service.js";
import { UserService } from "./users/service.js";

/**
 * IAM 公开 service facade。
 *
 * 子能力各自维护 SQL 与业务规则；路由和审计快照继续通过一个稳定入口访问，
 * 避免跨子目录了解内部文件布局。
 */
export const IamService = {
  ...RoleService,
  ...UserService,
  ...AssignmentService,
  ...OrganizationService,
};
