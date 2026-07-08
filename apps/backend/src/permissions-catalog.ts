import type { AllPermissionsCovered } from "./core/auth/permissions.js";
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
