/** 权限 code 的机器身份: `<resource>.<action>`。展示文案不参与授权判断。 */
export type PermissionCode = `${string}.${string}`;

/** builder 与运行时校验共用的权限片段规则。 */
export const PERMISSION_SEGMENT_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface PermissionDefinition {
  readonly code: PermissionCode;
  readonly resourceCode: string;
  readonly actionCode: string;
  readonly resourceLabel: string;
  readonly label: string;
}

/** HTTP 展示对象与 catalog 定义使用相同字段，但通过命名区分职责。 */
export type PermissionRef = PermissionDefinition;

type PermissionCatalogInput = Record<string, {
  readonly label: string;
  readonly actions: Record<string, string>;
}>;

type PermissionDefinitionsFor<T extends PermissionCatalogInput> = {
  [R in keyof T & string]: {
    [A in keyof T[R]["actions"] & string]: {
      readonly code: `${R}.${A}`;
      readonly resourceCode: R;
      readonly actionCode: A;
      readonly resourceLabel: T[R]["label"];
      readonly label: T[R]["actions"][A];
    };
  }[keyof T[R]["actions"] & string];
}[keyof T & string];

/**
 * 以 resource/action 为输入生成权限 catalog，避免手写 code、resource、action 三份值。
 * 同一 feature 的展示元数据仍与权限定义同源，但不会进入授权核心或数据库。
 */
export function definePermissionCatalog<const T extends PermissionCatalogInput>(
  input: T,
): readonly PermissionDefinitionsFor<T>[] {
  const definitions: PermissionDefinition[] = [];

  for (const [resourceCode, resource] of Object.entries(input)) {
    assertPermissionSegment(resourceCode, "resource");
    assertLabel(resource.label, `${resourceCode}.label`);

    for (const [actionCode, label] of Object.entries(resource.actions)) {
      assertPermissionSegment(actionCode, "action");
      assertLabel(label, `${resourceCode}.${actionCode}.label`);
      definitions.push({
        code: `${resourceCode}.${actionCode}`,
        resourceCode,
        actionCode,
        resourceLabel: resource.label,
        label,
      });
    }
  }

  return definitions as unknown as readonly PermissionDefinitionsFor<T>[];
}

function assertPermissionSegment(value: string, kind: "resource" | "action"): void {
  if (!PERMISSION_SEGMENT_PATTERN.test(value)) {
    throw new Error(`Invalid permission ${kind} code: ${value}`);
  }
}

function assertLabel(value: string, field: string): void {
  if (value.trim() === "") {
    throw new Error(`Permission label must not be empty: ${field}`);
  }
}

/** feature 以数组 slot 扩展，core 不 import 具体 feature。 */
export interface AppPermissionRegistry {}

type RegistryDefinitions = AppPermissionRegistry[keyof AppPermissionRegistry] extends infer T
  ? T extends readonly PermissionDefinition[] ? T[number] : never
  : never;

/** 当前应用所有已注册权限 code 的编译期联合。 */
export type AppPermissionCode = RegistryDefinitions["code"] & PermissionCode;

/** 组装点必须覆盖所有 feature registry 定义。 */
export type AllPermissionsCovered<T extends readonly PermissionDefinition[]>
  = [AppPermissionCode] extends [T[number]["code"]] ? true : never;

/** 组装点不得引入 registry 之外的权限。 */
export type NoUnknownPermissions<T extends readonly PermissionDefinition[]>
  = [T[number]["code"]] extends [AppPermissionCode] ? true : never;
