import { describe, expect, it } from "vitest";
import { requestIdHeader, resolveRequestId } from "./request-id-middleware.js";

describe("resolveRequestId", () => {
  it("有上游 header 时复用上游 id", () => {
    const req = new Request("https://example.com", {
      headers: { [requestIdHeader]: "upstream-id" },
    });

    expect(resolveRequestId(req)).toBe("upstream-id");
  });

  it("无上游 header 时生成 id", () => {
    const req = new Request("https://example.com");
    const id = resolveRequestId(req);

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("同一 Request 多次调用返回同一 id（WeakMap 缓存）", () => {
    const req = new Request("https://example.com");

    expect(resolveRequestId(req)).toBe(resolveRequestId(req));
  });
});
