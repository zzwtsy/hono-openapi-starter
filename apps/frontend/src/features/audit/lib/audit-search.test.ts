import { describe, expect, it } from "vitest";

import { parseAuditSearchDate } from "./audit-search";

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
