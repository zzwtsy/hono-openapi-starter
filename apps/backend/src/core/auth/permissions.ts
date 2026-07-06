/** 权限名格式:`<resource>.<action>`(如 `users.read`)。 */
export type PermissionName = `${string}.${string}`;

/** 确保 `T` 是合法权限名(供各 feature 定义字面量 union 用)。 */
export type EnsurePermissionName<T extends PermissionName> = T;

/**
 * 权限注册表:各 feature 在自己的 `permissions.ts` 通过 module augmentation 汇入。
 *
 * @example
 * declare module "@/core/auth/permissions" {
 *   interface AppPermissionRegistry {
 *     users: "users.read" | "users.create";
 *   }
 * }
 */
export interface AppPermissionRegistry {}

/**
 * 应用所有权限的联合类型(受 `AppPermissionRegistry` 约束,格式必须为 `<resource>.<action>`)。
 *
 * 注册表初始为空,此时该类型为 `never`——直接调 `requirePermission("xxx")` 会报
 * "Argument of type 'string' is not assignable to parameter of type 'never'"。
 * 各 feature 必须先通过 module augmentation(见 `AppPermissionRegistry`)声明自己的权限,
 * 才能在路由里使用 `requirePermission`。
 */
export type AppPermission = AppPermissionRegistry[keyof AppPermissionRegistry] & PermissionName;
