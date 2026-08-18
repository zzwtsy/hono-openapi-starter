import { describe, expect, it } from "vitest";

import { countActiveFilterGroups, hasActiveFilters, presetToRange, TIME_PRESETS } from "./audit-filters";

describe("hasActiveFilters", () => {
  it("无筛选 false,有筛选 true", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ actions: [] })).toBe(false);
    expect(hasActiveFilters({ actions: ["auth.sign-in", "iam.role.create"] })).toBe(true);
    expect(hasActiveFilters({ status: "failure" })).toBe(true);
    expect(hasActiveFilters({ actorKeyword: "  " })).toBe(false); // 纯空白不算
    expect(hasActiveFilters({ from: "2026-07-01T00:00:00.000Z" })).toBe(true);
  });
});

describe("countActiveFilterGroups", () => {
  it("多个 action 只算一个筛选组，时间起止也只算一个", () => {
    expect(countActiveFilterGroups({
      actions: ["auth.sign-in", "iam.role.create"],
      status: "failure",
      actorKeyword: "Admin",
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-02T00:00:00.000Z",
    })).toBe(4);
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
