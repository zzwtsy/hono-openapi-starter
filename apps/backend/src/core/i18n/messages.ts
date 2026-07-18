import type { ErrorCode } from "../errors/error-registry.js";

import type { Locale } from "./locale.js";
import { errorRegistry } from "../errors/error-registry.js";

/**
 * 消息字典：en 从 errorRegistry.defaultMessage 派生（单一真相），zh 单独维护。
 *
 * zh 用 `satisfies Record<ErrorCode, string>` 强制完整覆盖：新增 ErrorCode 时若忘补 zh，
 * typecheck 即失败（类型驱动的完整性保证，比测试检查更强）。
 */
const en: Record<ErrorCode, string> = Object.fromEntries(
  Object.entries(errorRegistry).map(([code, meta]) => [code, meta.defaultMessage]),
) as Record<ErrorCode, string>;

const zh: Record<ErrorCode, string> = {
  COMMON_OK: "成功",
  COMMON_VALIDATION_FAILED: "请求校验失败",
  COMMON_UNAUTHORIZED: "未认证",
  COMMON_FORBIDDEN: "无权限",
  AUTH_ACCOUNT_DISABLED: "账号已禁用",
  AUTH_SIGNUP_DISABLED: "不支持自助注册",
  COMMON_NOT_FOUND: "资源不存在",
  COMMON_CONFLICT: "资源冲突",
  COMMON_RATE_LIMITED: "请求过于频繁",
  COMMON_SERVICE_UNAVAILABLE: "服务不可用",
  COMMON_INTERNAL_ERROR: "内部错误",
  USER_NOT_FOUND: "用户不存在",
  USER_EMAIL_ALREADY_EXISTS: "邮箱已存在",
  USER_NO_CREDENTIAL_ACCOUNT: "用户无密码账号",
  USER_CANNOT_DISABLE_SELF: "不能禁用自己",
  USER_CANNOT_REVOKE_OWN_AUTH: "不能撤销自己的授权",
  ROLE_NOT_FOUND: "角色不存在",
  ROLE_NAME_CONFLICT: "角色名已存在",
  PERMISSION_NOT_FOUND: "权限不存在: {permission}",
  ORG_NOT_FOUND: "组织不存在",
  ORG_CYCLE: "组织会形成环",
  ORG_HAS_CHILDREN: "组织有子组织",
  ORG_HAS_USERS: "组织下仍有用户",
  PROJECT_NOT_FOUND: "项目不存在",
  PROJECT_NAME_CONFLICT: "项目名已存在",
  SETTING_KEY_UNKNOWN: "未知配置项",
} satisfies Record<ErrorCode, string>;

export const messages: Record<Locale, Record<ErrorCode, string>> = {
  en,
  zh,
};
