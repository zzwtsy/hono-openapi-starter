import type { AllPermissionsCovered, AppPermission } from "./core/auth/permissions.js";
import { iamPermissions } from "./features/iam/permissions.js";
import { projectPermissions } from "./features/projects/permissions.js";

/**
 * 权限目录组装点:汇总各 feature 的权限定义(运行时目录)。
 *
 * 加 feature 时在此追加 import + 展开;漏汇总由 `AllPermissionsCovered` 编译期抓
 * (`AppPermission` 不被覆盖 -> never = true 报)。
 *
 * core 不 import features;本模块是组装层,供 `index.ts`/`bootstrap.ts`/`seed.ts`/测试复用。
 */
export const allPermissions = [...projectPermissions, ...iamPermissions] as const;

// 编译期覆盖校验:漏展开某 feature -> AppPermission 不被覆盖 -> never = true 编译报。
const _coverCheck: AllPermissionsCovered<typeof allPermissions> = true;

/**
 * 所有权限名的字面量数组(只在类型层宽化为 readonly AppPermission[],不丢字面量 union),
 * 供 z.enum(allPermissionNames) 构建 OpenAPI enum(后端是权限名单单一事实源,
 * 前端经 gen:api 据此生成字面量 union,零手写漂移)。
 *
 * 不直接用 `.map(p => p.name)` 裸赋值:那会得到 `string[]` 导致 zod 4 `z.enum` 推不出字面量 union。
 * 显式断言到 `readonly AppPermission[]` 把元素收窄回后端的强类型 union。
 * catalog 加 feature 时两者自动同源(此数组从 allPermissions 派生)。
 */
export const allPermissionNames = allPermissions
  .map(p => p.name) as readonly AppPermission[];

/**
 * 运行时收窄:把来自数据层(`PermissionChecker.listEffectivePermissions` -> DB role_permissions)
 * 的 `string[]` 过滤为 `AppPermission[]`,供 `/api/v1/me` 响应满足 `z.enum(allPermissionNames)` 类型。
 *
 * 数据源本应全是同步目录内的名字;过滤未知名属于防御性降级(脏数据不误暴露给前端),
 * 与前端契约一致:前端 enum union 之外的名字会被 codegen 类型拒收。
 */
export function toAppPermissions(names: readonly string[]): AppPermission[] {
  const known = new Set<string>(allPermissionNames);
  return names.filter((n): n is AppPermission => known.has(n));
}
