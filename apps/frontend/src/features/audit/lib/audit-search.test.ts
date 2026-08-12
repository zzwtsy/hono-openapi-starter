import { describe, expect, it } from "vitest";

import {
  parseAuditSearchActions,
  parseAuditSearchDate,
  parseAuditSearchDateRange,
  parseAuditSearchPage,
  parseAuditSearchPageSize,
} from "./audit-search";

describe("parseAuditSearchPage", () => {
  it("保留 Router JSON 解析后的数字分页参数", () => {
    expect(parseAuditSearchPage(2)).toBe(2);
    expect(parseAuditSearchPageSize(50)).toBe(50);
  });

  it("兼容字符串并拒绝无效分页参数", () => {
    expect(parseAuditSearchPage("2")).toBe(2);
    expect(parseAuditSearchPage(0)).toBeUndefined();
    expect(parseAuditSearchPage(1.5)).toBeUndefined();
    expect(parseAuditSearchPage("invalid")).toBeUndefined();
    expect(parseAuditSearchPageSize(10)).toBeUndefined();
    expect(parseAuditSearchPageSize(100)).toBe(100);
  });
});

describe("parseAuditSearchActions", () => {
  it("兼容单值与数组并去重、清理空值", () => {
    expect(parseAuditSearchActions("auth.sign-in")).toEqual(["auth.sign-in"]);
    expect(parseAuditSearchActions("auth.sign-in,iam.role.create")).toEqual(["auth.sign-in", "iam.role.create"]);
    expect(parseAuditSearchActions([" auth.sign-in ", "", "auth.sign-in", "iam.role.create", 1])).toEqual([
      "auth.sign-in",
      "iam.role.create",
    ]);
  });

  it("无有效动作时归一为 undefined，并限制最多 50 项", () => {
    expect(parseAuditSearchActions(undefined)).toBeUndefined();
    expect(parseAuditSearchActions(["", null])).toBeUndefined();
    expect(parseAuditSearchActions(Array.from({ length: 60 }, (_, index) => `action-${index}`))).toHaveLength(50);
  });
});

describe("parseAuditSearchDate", () => {
  it("保留有效 ISO datetime", () => {
    const value = "2026-07-10T12:00:00.000Z";

    expect(parseAuditSearchDate(value)).toBe(value);
  });

  it("将无效或非字符串 search 值归一为 undefined", () => {
    expect(parseAuditSearchDate("2026-07-10")).toBeUndefined();
    expect(parseAuditSearchDate("not-a-date")).toBeUndefined();
    expect(parseAuditSearchDate(123)).toBeUndefined();
    expect(parseAuditSearchDate(null)).toBeUndefined();
  });
});

describe("parseAuditSearchDateRange", () => {
  const from = "2026-07-10T00:00:00.000Z";
  const to = "2026-07-10T23:59:59.999Z";

  it("保留完整范围和只有开始时间的预设范围", () => {
    expect(parseAuditSearchDateRange(from, to)).toEqual({ from, to });
    expect(parseAuditSearchDateRange(from, undefined)).toEqual({ from, to: undefined });
  });

  it("缺少有效开始时间时同时丢弃结束时间", () => {
    expect(parseAuditSearchDateRange(undefined, to)).toEqual({ from: undefined, to: undefined });
    expect(parseAuditSearchDateRange("invalid", to)).toEqual({ from: undefined, to: undefined });
  });
});
