import { describe, expect, it } from "vitest";

import { REDACTED } from "../logger/redact.js";
import { sanitize } from "./sanitize.js";

describe("audit sanitize", () => {
  it("原始值和 null 直传", () => {
    expect(sanitize("hello")).toBe("hello");
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBe(null);
    expect(sanitize(undefined)).toBe(undefined);
  });

  it("敏感字段替换为 REDACTED", () => {
    const result = sanitize({ name: "张三", password: "secret123" });
    expect(result).toEqual({ name: "张三", password: REDACTED });
  });

  it("大小写不敏感匹配", () => {
    const result = sanitize({ Password: "secret", apiKey: "key123" });
    expect(result).toEqual({ Password: REDACTED, apiKey: REDACTED });
  });

  it("递归脱敏嵌套对象", () => {
    const result = sanitize({
      user: { name: "张三", token: "abc" },
      role: "admin",
    });
    expect(result).toEqual({
      user: { name: "张三", token: REDACTED },
      role: "admin",
    });
  });

  it("递归脱敏数组", () => {
    const result = sanitize([
      { name: "张三", password: "p1" },
      { name: "李四", password: "p2" },
    ]);
    expect(result).toEqual([
      { name: "张三", password: REDACTED },
      { name: "李四", password: REDACTED },
    ]);
  });

  it("不修改原对象", () => {
    const original = { password: "secret", name: "test" };
    sanitize(original);
    expect(original.password).toBe("secret");
  });

  it("脱敏多种敏感字段", () => {
    const result = sanitize({
      password: "p",
      token: "t",
      apiKey: "k",
      secret: "s",
      authorization: "Bearer x",
      cookie: "c",
    });
    expect(result).toEqual({
      password: REDACTED,
      token: REDACTED,
      apiKey: REDACTED,
      secret: REDACTED,
      authorization: REDACTED,
      cookie: REDACTED,
    });
  });
});
