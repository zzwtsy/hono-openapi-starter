import { describe, expect, it } from "vitest";

import { deriveActiveFilters, hasActiveFilters, presetToRange, TIME_PRESETS } from "./audit-filters";

const ACTIONS = [
  { action: "projects.update", label: "修改项目" },
  { action: "iam.user.create", label: "创建用户" },
] as const;

describe("deriveActiveFilters", () => {
  it("空筛选返回空数组", () => {
    expect(deriveActiveFilters({}, ACTIONS)).toEqual([]);
  });

  it("action 用目录 label 显示", () => {
    expect(deriveActiveFilters({ action: "projects.update" }, ACTIONS)).toEqual([
      { key: "action", label: "操作：修改项目" },
    ]);
  });

  it("未知 action 回退原文", () => {
    expect(deriveActiveFilters({ action: "unknown.action" }, ACTIONS)).toEqual([
      { key: "action", label: "操作：unknown.action" },
    ]);
  });

  it("status 中文化", () => {
    expect(deriveActiveFilters({ status: "success" }, ACTIONS)).toEqual([{ key: "status", label: "结果：成功" }]);
    expect(deriveActiveFilters({ status: "failure" }, ACTIONS)).toEqual([{ key: "status", label: "结果：失败" }]);
  });

  it("actorKeyword 去除首尾空白", () => {
    expect(deriveActiveFilters({ actorKeyword: " 张三 " }, ACTIONS)).toEqual([{ key: "actorKeyword", label: "操作人：张三" }]);
  });

  it("from/to 截取日期部分", () => {
    expect(deriveActiveFilters({ from: "2026-07-01T00:00:00.000Z" }, ACTIONS)).toEqual([
      { key: "from", label: "起始：2026-07-01" },
    ]);
    expect(deriveActiveFilters({ to: "2026-07-31T23:59:59.999Z" }, ACTIONS)).toEqual([
      { key: "to", label: "截止：2026-07-31" },
    ]);
  });

  it("多筛选按固定顺序", () => {
    expect(deriveActiveFilters({ to: "2026-07-31T23:59:59.999Z", action: "projects.update" }, ACTIONS)).toEqual([
      { key: "action", label: "操作：修改项目" },
      { key: "to", label: "截止：2026-07-31" },
    ]);
  });
});

describe("hasActiveFilters", () => {
  it("无筛选 false,有筛选 true", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ status: "failure" })).toBe(true);
    expect(hasActiveFilters({ actorKeyword: "  " })).toBe(false); // 纯空白不算
  });
});

describe("TIME_PRESETS / presetToRange", () => {
  it("预设有 3 档", () => {
    expect(TIME_PRESETS.map(p => p.key)).toEqual(["24h", "7d", "30d"]);
  });

  it("24h 预设返回 now-24h 的 ISO 起", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");
    expect(presetToRange("24h", now)).toEqual({ from: "2026-07-09T12:00:00.000Z" });
  });

  it("未知预设返回空 from(调用方忽略)", () => {
    expect(presetToRange("invalid" as never)).toEqual({ from: "" });
  });
});
