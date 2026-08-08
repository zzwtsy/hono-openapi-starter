import { describe, expect, it } from "vitest";

import { definePermissionCatalog } from "./permissions.js";

describe("definePermissionCatalog", () => {
  it("由 resource/action 生成唯一 code 和展示元数据", () => {
    const catalog = definePermissionCatalog({
      projects: {
        label: "项目",
        actions: { "read": "查看项目", "bulk-export": "批量导出" },
      },
    });

    expect(catalog).toEqual([
      {
        code: "projects.read",
        resourceCode: "projects",
        actionCode: "read",
        resourceLabel: "项目",
        label: "查看项目",
      },
      {
        code: "projects.bulk-export",
        resourceCode: "projects",
        actionCode: "bulk-export",
        resourceLabel: "项目",
        label: "批量导出",
      },
    ]);
  });

  it("拒绝非法 code 片段和空展示文案", () => {
    expect(() => definePermissionCatalog({
      Project: { label: "项目", actions: { read: "查看" } },
    })).toThrow("Invalid permission resource code");

    expect(() => definePermissionCatalog({
      projects: { label: "项目", actions: { read_all: "查看" } },
    })).toThrow("Invalid permission action code");

    expect(() => definePermissionCatalog({
      projects: { label: " ", actions: { read: "查看" } },
    })).toThrow("Permission label must not be empty");
  });
});
