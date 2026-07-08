/** 权限名格式:`<resource>.<action>`(如 `users.read`)。 */
export type PermissionName = `${string}.${string}`;

/**
 * 权限定义:name + 可选 description。
 *
 * 各 feature 在自己的 `permissions.ts` 用 `as const satisfies readonly PermissionDefinition[]`
 * 声明权限数组(运行时目录,供组装点汇总传 `syncAuthorizationCatalog`);同时用 `declare module`
 * 把权限名 push 到 `AppPermissionRegistry`(类型层)。权限名只写一次,漏登记编译期报错。
 *
 * `description` 进数据库 `permissions` 表,供管理界面展示。
 */
export interface PermissionDefinition {
  name: PermissionName;
  description?: string;
}

/**
 * 权限注册表:各 feature 用 `declare module` 扩展(core 不 import features)。
 * 初始空,features push 权限名进来。实现"类型反转":core 持类型,features push 内容。
 */
export interface AppPermissionRegistry {}

/**
 * 应用所有权限名的联合(从 `AppPermissionRegistry` 推导,被 features 扩展)。
 * 初始 `never`(空 registry);features 扩展后成 union。`requirePermission(perm: AppPermission)` 据此编译期校验。
 */
export type AppPermission = keyof AppPermissionRegistry & PermissionName;

/**
 * 校验权限定义数组覆盖所有 `AppPermission`(组装点用,防漏汇总某 feature)。
 * 非 distributive(包 tuple):任一 `AppPermission` 不在数组 name 中则 `never`,`const _: true = never` 编译报。
 */
export type AllPermissionsCovered<T extends readonly PermissionDefinition[]>
  = [AppPermission] extends [T[number]["name"]] ? true : never;
