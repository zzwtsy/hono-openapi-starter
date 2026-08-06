import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetAuditActionRegistryForTest,
  defineAuditAction,
  getAuditActionCatalog,
  registerAuditAction,
} from "@/core/audit/action.js";

describe("audit action registry", () => {
  beforeEach(() => {
    __resetAuditActionRegistryForTest();
  });

  it("动作代码唯一且每项都有展示标签", () => {
    registerAuditAction(defineAuditAction("projects.create", "创建项目"));
    registerAuditAction(defineAuditAction("projects.update", "修改项目"));
    // 同一个 descriptor 重复注册不产生重复 catalog 项。
    registerAuditAction(defineAuditAction("projects.create", "创建项目"));

    const catalog = getAuditActionCatalog();
    const actions = catalog.map(item => item.action);

    expect(new Set(actions).size).toBe(actions.length);
    expect(catalog.every(item => item.action.length > 0 && item.label.length > 0)).toBe(true);
    expect(catalog).toEqual([
      { action: "projects.create", label: "创建项目" },
      { action: "projects.update", label: "修改项目" },
    ]);
  });

  it("同一个 action 使用不同 label 时在装配期失败", () => {
    registerAuditAction(defineAuditAction("projects.update", "修改项目"));

    expect(() => {
      registerAuditAction(defineAuditAction("projects.update", "更新项目"));
    }).toThrow("audit action label mismatch: projects.update");
  });
});
