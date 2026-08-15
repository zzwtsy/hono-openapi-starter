import { describe, expect, it } from "vitest";

import { $$userConfigMap } from "./method-config";

interface MethodConfig {
  cacheFor?: number;
  hitSource?: readonly string[];
  name?: string;
}

const configs = $$userConfigMap as Record<string, MethodConfig>;

function getConfig(name: string): MethodConfig {
  const config = configs[name];
  expect(config, `缺少 method 配置: ${name}`).toBeDefined();
  return config;
}

describe("API method cache policy", () => {
  it("每个 hitSource 都指向已命名的 mutation", () => {
    const mutationNames = new Set(
      Object.values(configs)
        .map(config => config.name)
        .filter((name): name is string => name !== undefined),
    );

    for (const [methodName, config] of Object.entries(configs)) {
      for (const source of config.hitSource ?? []) {
        expect(mutationNames, `${methodName} 引用了未命名 mutation: ${source}`).toContain(source);
      }
    }
  });

  it("每个 mutation 的 name 与其 method key 一致", () => {
    for (const [methodName, config] of Object.entries(configs)) {
      if (config.name !== undefined) {
        expect(config.name).toBe(methodName);
      }
    }
  });

  it("角色权限变化会失效角色、用户权限和当前授权缓存", () => {
    const permissionMutationNames = [
      "IAM.assignUserRole",
      "IAM.deleteUserRole",
      "IAM.assignUserPermission",
      "IAM.deleteUserPermission",
      "IAM.assignRolePermissions",
      "IAM.updateRolePermissions",
      "IAM.deleteRolePermission",
    ];

    for (const target of ["IAM.getTargetCapabilities", "IAM.getMyAuthorization", "IAM.listUserPermissions"]) {
      expect(getConfig(target).hitSource).toEqual(expect.arrayContaining(permissionMutationNames));
    }
  });

  it("审计列表保持实时读取，动作目录才使用长期缓存", () => {
    expect(getConfig("Audit.listAuditActions").cacheFor).toBe(Infinity);
    expect(getConfig("Audit.listAuditLogs").cacheFor).toBe(0);
    expect(getConfig("Audit.listAuditLogsByResource").cacheFor).toBe(0);
  });
});
