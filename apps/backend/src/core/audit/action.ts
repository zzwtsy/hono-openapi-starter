/**
 * 审计动作定义:动作代码与展示标签必须成对出现,避免路由配置与 action catalog 漂移。
 *
 * 动作定义由具体 feature 持有,core/audit 只依赖这个无业务语义的 descriptor。
 */
export interface AuditActionDefinition<
  TAction extends string = string,
  TLabel extends string = string,
> {
  readonly action: TAction;
  readonly label: TLabel;
  /** 预留多语言 label key;当前前端仍使用 label。 */
  readonly labelKey?: string;
}

/** 创建类型安全的审计动作定义。 */
export function defineAuditAction<
  const TAction extends string,
  const TLabel extends string,
>(action: TAction, label: TLabel, labelKey?: string): AuditActionDefinition<TAction, TLabel> {
  return labelKey == null ? { action, label } : { action, label, labelKey };
}

export type AuditActionCatalogItem = Pick<AuditActionDefinition, "action" | "label">;

const registeredActions = new Map<string, AuditActionDefinition>();

/**
 * 注册应用已装配的审计动作。
 *
 * 路由调用 `audit()` 时自动注册;非路由事件(如 Better Auth hook)显式注册。
 * 同一 action 重复注册时允许相同 label,但拒绝 label 漂移。
 */
export function registerAuditAction(action: AuditActionDefinition): void {
  const existing = registeredActions.get(action.action);
  if (existing != null) {
    if (existing.label !== action.label) {
      throw new Error(`audit action label mismatch: ${action.action}`);
    }
    return;
  }
  registeredActions.set(action.action, action);
}

/** 返回当前应用已注册的 action catalog,不暴露内部 descriptor 引用。 */
export function getAuditActionCatalog(): AuditActionCatalogItem[] {
  return Array.from(registeredActions.values(), ({ action, label }) => ({ action, label }));
}

/** 测试辅助:隔离模块级 action registry。 */
export function __resetAuditActionRegistryForTest(): void {
  registeredActions.clear();
}
