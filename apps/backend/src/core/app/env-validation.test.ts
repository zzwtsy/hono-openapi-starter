import { describe, expect, it } from "vitest";
import { formatEnvValidationError, safeParseEnv } from "./env-validation.js";

const validEnv = {
  NODE_ENV: "development",
  PORT: "3001",
  LOG_LEVEL: "info",
  DATABASE_URL: "postgres://localhost/app",
  BETTER_AUTH_SECRET: "please-change-me-with-at-least-32-chars",
  BETTER_AUTH_URL: "http://localhost:3001",
} as NodeJS.ProcessEnv;

describe("safeParseEnv", () => {
  it("合法 env 校验通过", () => {
    expect(safeParseEnv(validEnv).success).toBe(true);
  });

  it("缺少必填字段校验失败", () => {
    const result = safeParseEnv({ ...validEnv, DATABASE_URL: undefined });

    expect(result.success).toBe(false);
  });
});

describe("formatEnvValidationError", () => {
  it("错误信息包含字段名与文件提示", () => {
    const result = safeParseEnv({ ...validEnv, DATABASE_URL: undefined });
    if (!result.success) {
      const msg = formatEnvValidationError(result.error, ".env.example");

      expect(msg).toContain("DATABASE_URL");
      expect(msg).toContain(".env.example");
    }
  });
});
