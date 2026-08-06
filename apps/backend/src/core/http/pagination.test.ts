import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { CursorPaginationQuerySchema, decodeCursor, encodeCursor, OffsetPaginationQuerySchema } from "./pagination.js";

describe("pagination cursor", () => {
  it("encode + decode 往返一致", () => {
    const data = { occurredAt: "2026-07-15T14:30:00.000Z", id: "abc-123" };
    const encoded = encodeCursor(data);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(data);
  });

  it("decode 无效 base64 返回 null", () => {
    expect(decodeCursor("!!!invalid!!!")).toBeNull();
  });

  it("decode 缺少字段返回 null", () => {
    const bad = Buffer.from(JSON.stringify({ occurredAt: "2026-01-01" })).toString("base64");
    expect(decodeCursor(bad)).toBeNull();
  });
});

describe("OffsetPaginationQuerySchema", () => {
  it("默认值 page=1 pageSize=25", () => {
    const result = OffsetPaginationQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it("string 输入被 coerce 为 number", () => {
    const result = OffsetPaginationQuerySchema.parse({ page: "3", pageSize: "50" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("pageSize 超过 100 报错", () => {
    expect(() => OffsetPaginationQuerySchema.parse({ pageSize: 101 })).toThrow();
  });
});

describe("CursorPaginationQuerySchema", () => {
  it("cursor 可选,pageSize 默认 25", () => {
    const result = CursorPaginationQuerySchema.parse({});
    expect(result.cursor).toBeUndefined();
    expect(result.pageSize).toBe(25);
  });

  it("带 cursor 时解析为 string", () => {
    const result = CursorPaginationQuerySchema.parse({ cursor: "abc", pageSize: "10" });
    expect(result.cursor).toBe("abc");
    expect(result.pageSize).toBe(10);
  });
});
