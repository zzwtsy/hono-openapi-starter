import { getAuditActionCatalog } from "@/core/audit/action.js";

/**
 * audit feature 的 action catalog 适配层。
 *
 * 具体 action 在各路由调用 `audit()` 时注册,本 feature 只暴露查询所需的 catalog,
 * 不直接依赖其他 feature 的内部 action 文件。
 */
export function listRegisteredAuditActions() {
  return getAuditActionCatalog();
}
