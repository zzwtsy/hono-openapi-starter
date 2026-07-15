import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("保留安全的内部路径", () => {
    expect(safeRedirect("/iam/users")).toBe("/iam/users");
  });

  it("保留带 query 的内部路径", () => {
    expect(safeRedirect("/login?x=1")).toBe("/login?x=1");
  });

  it("拒绝协议相对 URL(//evil)", () => {
    expect(safeRedirect("//evil.example")).toBe("/dashboard");
  });

  it("拒绝绝对外链", () => {
    expect(safeRedirect("https://evil.example")).toBe("/dashboard");
  });

  it("target 为 undefined 时回退默认页", () => {
    expect(safeRedirect(undefined)).toBe("/dashboard");
  });

  it("支持自定义 fallback", () => {
    expect(safeRedirect(undefined, "/settings")).toBe("/settings");
  });
});
