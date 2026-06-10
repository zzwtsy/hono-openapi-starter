import { describe, expect, it } from "vitest";

import { AppError } from "../errors/app-error.js";

import { createErrorLogFields } from "./fields.js";
import { REDACTED } from "./redact.js";

const baseInput = {
  requestId: "req_test",
  req: {
    method: "GET",
    url: "/test",
    remoteAddress: "127.0.0.1",
  },
  res: {
    statusCode: 418,
  },
  responseTime: 12,
};

describe("createErrorLogFields", () => {
  it("uses the status supplied by the middleware", () => {
    const fields = createErrorLogFields(new AppError("COMMON_CONFLICT"), baseInput);

    expect(fields).toMatchObject({
      code: "COMMON_CONFLICT",
      status: 418,
      type: "business",
      req: {
        method: "GET",
        url: "/test",
        remoteAddress: "127.0.0.1",
      },
      res: {
        statusCode: 418,
      },
      responseTime: 12,
    });
  });

  it("sanitizes sensitive text from stack and Error causes", () => {
    const error = new Error("Invalid password=secret for user@example.com", {
      cause: new Error("Cause token=secret for user@example.com"),
    });

    const fields = createErrorLogFields(error, baseInput);

    expect(fields.stack).not.toContain("user@example.com");
    expect(fields.stack).not.toContain("password=secret");
    expect(fields.cause).toMatchObject({
      message: `Cause token=${REDACTED} for ${REDACTED}`,
    });
  });
});
