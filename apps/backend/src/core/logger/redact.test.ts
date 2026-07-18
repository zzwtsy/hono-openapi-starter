import type { AppLoggerConfig } from "./config.js";

import { BlankTransport, LogLevel } from "loglayer";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "../errors/app-error.js";

import { createAppLogger } from "./index.js";
import { REDACTED, sanitizeErrorText } from "./redact.js";

vi.mock("../../env.js", () => ({
  default: {
    NODE_ENV: "test",
    PORT: 3001,
    LOG_LEVEL: "trace",
    LOG_MAX_FILES: 1,
    DATABASE_URL: "postgres://user:password@localhost:5432/app",
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-chars",
    BETTER_AUTH_URL: "http://localhost:3001",
  },
}));

interface LogEntry {
  data: Record<string, unknown>;
}

const testLoggerConfig: AppLoggerConfig = {
  environment: "test",
  level: "trace",
  logFile: "./logs/app-%DATE%.jsonl",
  auditFile: "./logs/.audit.json",
  maxLogs: 1,
};

describe("logger redaction", () => {
  it("redacts sensitive metadata fields through the LogLayer plugin", () => {
    const { entries, logger } = createCaptureLogger();

    logger.withMetadata({
      "authorization": "Bearer hidden",
      "Cookie": "sid=hidden",
      "password": "hidden",
      "token": "hidden",
      "apiKey": "hidden",
      "x-api-key": "hidden",
      "nested": {
        clientSecret: "hidden",
        refresh_token: "hidden",
        tokenExpiresAt: "2026-06-10T00:00:00.000Z",
        tokenTtl: 60,
        tokenType: "Bearer",
      },
    }).info("metadata");

    expect(entries[0]?.data).toMatchObject({
      "authorization": REDACTED,
      "Cookie": REDACTED,
      "password": REDACTED,
      "token": REDACTED,
      "apiKey": REDACTED,
      "x-api-key": REDACTED,
      "nested": {
        clientSecret: REDACTED,
        refresh_token: REDACTED,
        tokenExpiresAt: "2026-06-10T00:00:00.000Z",
        tokenTtl: 60,
        tokenType: "Bearer",
      },
    });
  });

  it("redacts sensitive pino-http request headers and raw root data", () => {
    const { entries, logger } = createCaptureLogger();

    logger.withMetadata({
      req: {
        method: "GET",
        url: "/private",
        headers: {
          authorization: "Bearer hidden",
          cookie: "sid=hidden",
        },
      },
    }).info("request completed");
    logger.raw({
      logLevel: LogLevel.info,
      messages: ["raw log"],
      rootData: {
        req: {
          headers: {
            authorization: "Bearer hidden",
            cookie: "sid=hidden",
          },
        },
        apiKey: "hidden",
      },
    });

    expect(entries[0]?.data).toMatchObject({
      req: {
        headers: {
          authorization: REDACTED,
          cookie: REDACTED,
        },
      },
    });
    expect(entries[1]?.data).toMatchObject({
      req: {
        headers: {
          authorization: REDACTED,
          cookie: REDACTED,
        },
      },
      apiKey: REDACTED,
    });
  });

  it("redacts serialized error fields and sanitizes error text", () => {
    const { entries, logger } = createCaptureLogger();
    // details 收窄为 ValidationErrorDetail[] 后(B3 D3),不再有任意结构敏感字段;
    // 此用例聚焦 message/stack 脱敏,details 用合法 ErrorDetail[] 形状验证其被保留。
    const error = new AppError("COMMON_CONFLICT", {
      details: [{ path: ["body", "email"], message: "邮箱 password=hidden 无效 for user@example.com" }],
      message: "Invalid password=hidden for user@example.com",
    });

    logger.withError(error).error("request failed");

    const err = entries[0]?.data.err as Record<string, unknown> | undefined;
    const details = err?.details as Array<{ message?: string }> | undefined;

    expect(err?.message).toBe(`Invalid password=${REDACTED} for ${REDACTED}`);
    expect(String(err?.stack)).not.toContain("user@example.com");
    expect(String(err?.stack)).not.toContain("password=hidden");
    expect(details).toHaveLength(1);
    // details 是结构化数组,redact 只对顶层 message/stack 字符串脱敏,
    // details 内部 message 不额外脱敏(校验错误说明通常无敏感内容)。
    expect(details?.[0]?.message).toBe("邮箱 password=hidden 无效 for user@example.com");
  });

  it("sanitizes sensitive text in error cause chains", () => {
    const { entries, logger } = createCaptureLogger();
    const error = new Error("outer", {
      cause: new Error("Cause token=hidden for user@example.com"),
    });

    logger.withError(error).error("request failed");

    const err = entries[0]?.data.err as { cause?: { message?: string; stack?: string } } | undefined;

    expect(err?.cause?.message).toBe(`Cause token=${REDACTED} for ${REDACTED}`);
    expect(err?.cause?.stack).not.toContain("user@example.com");
    expect(err?.cause?.stack).not.toContain("token=hidden");
  });

  it("sanitizes high-risk free text", () => {
    expect(sanitizeErrorText("Bearer abc.123 token=hidden user@example.com")).toBe(
      `Bearer ${REDACTED} token=${REDACTED} ${REDACTED}`,
    );
  });
});

function createCaptureLogger() {
  const entries: LogEntry[] = [];
  const logger = createAppLogger(testLoggerConfig, [
    new BlankTransport({
      shipToLogger: ({ data, hasData }) => {
        entries.push({
          data: hasData === true && isRecord(data) ? data : {},
        });

        return [];
      },
    }),
  ]);

  return { entries, logger };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
