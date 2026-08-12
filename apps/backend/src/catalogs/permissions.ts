import type {
  AllPermissionsCovered,
  AppPermissionCode,
  NoUnknownPermissions,
  PermissionDefinition,
  PermissionRef,
} from "@/core/auth/permissions.js";
import { PERMISSION_SEGMENT_PATTERN } from "@/core/auth/permissions.js";
import { auditPermissions } from "@/features/audit/permissions.js";
import { iamPermissions } from "@/features/iam/permissions.js";
import { projectPermissions } from "@/features/projects/permissions.js";
import { systemSettingPermissions } from "@/features/system-settings/permissions.js";

/** 应用级权限目录组装点。 */
export const allPermissions = [
  ...projectPermissions,
  ...iamPermissions,
  ...systemSettingPermissions,
  ...auditPermissions,
] as const;

const _coverCheck: AllPermissionsCovered<typeof allPermissions> = true;
const _unknownCheck: NoUnknownPermissions<typeof allPermissions> = true;
void _coverCheck;
void _unknownCheck;

/** 运行时验证应用汇总 catalog，防止多个 feature 贡献重复或自相矛盾的 code。 */
export function assertPermissionCatalog(definitions: readonly PermissionDefinition[]): void {
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.code)) {
      throw new Error(`Duplicate permission code: ${definition.code}`);
    }
    seen.add(definition.code);

    if (!PERMISSION_SEGMENT_PATTERN.test(definition.resourceCode)
      || !PERMISSION_SEGMENT_PATTERN.test(definition.actionCode)) {
      throw new Error(`Invalid permission code segments: ${definition.code}`);
    }
    if (definition.code !== `${definition.resourceCode}.${definition.actionCode}`) {
      throw new Error(`Permission code does not match its segments: ${definition.code}`);
    }
    if (definition.resourceLabel.trim() === "" || definition.label.trim() === "") {
      throw new Error(`Permission labels must not be empty: ${definition.code}`);
    }
  }
}

assertPermissionCatalog(allPermissions);

/** OpenAPI enum 与后端注册联合共用同一目录。 */
export const allPermissionCodes = allPermissions
  .map(permission => permission.code) as [AppPermissionCode, ...AppPermissionCode[]];

const permissionByCode = new Map<string, PermissionRef>(
  allPermissions.map(permission => [permission.code, permission]),
);

export type AppPermissionRef = Omit<PermissionRef, "code"> & { code: AppPermissionCode };

/** 严格将 code 解析为展示 ref；未知 code 表示 catalog/DB 漂移，不静默过滤。 */
export function getPermissionRef(code: string): PermissionRef {
  const permission = permissionByCode.get(code);
  if (permission == null) {
    throw new Error(`Unknown permission code: ${code}`);
  }
  return permission;
}

export function toPermissionRefs(codes: readonly string[]): AppPermissionRef[] {
  return codes.map((code) => {
    const permission = getPermissionRef(code);
    return { ...permission, code: permission.code as AppPermissionCode };
  });
}

/** 将 DB 返回的权限 code 严格收窄为当前应用权限联合。 */
export function toAppPermissionCodes(codes: readonly string[]): AppPermissionCode[] {
  return codes.map(code => getPermissionRef(code).code as AppPermissionCode);
}
