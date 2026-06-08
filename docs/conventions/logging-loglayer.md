---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# LogLayer 日志规范

## 基本原则

使用 LogLayer 作为统一日志门面。

环境策略：

| 环境 | 输出 |
| --- | --- |
| development | pretty console |
| production | JSONL file，按天轮转 |

## 目录结构

```txt
src/core/logger/
  index.ts
  config.ts
  fields.ts
  redact.ts
  middleware.ts
  transports/
    dev-pretty.ts
    prod-jsonl.ts
```

## 必填字段

| 字段 | 说明 |
| --- | --- |
| `ts` | ISO 时间 |
| `level` | 日志级别 |
| `msg` | 日志消息 |
| `requestId` | 请求唯一标识 |

请求日志额外字段：

| 字段 | 说明 |
| --- | --- |
| `method` | HTTP 方法 |
| `path` | 请求路径 |
| `status` | HTTP 状态码 |
| `durationMs` | 请求耗时 |
| `userId` | 已认证用户 ID，可为空 |

错误日志额外字段：

| 字段 | 说明 |
| --- | --- |
| `code` | 业务错误码 |
| `status` | HTTP 状态码 |
| `stack` | 错误栈 |
| `cause` | 原始错误原因 |

## JSONL 示例

```json
{"ts":"2026-06-03T12:00:00.000Z","level":"info","msg":"request completed","requestId":"req_123","method":"GET","path":"/api/v1/users","status":200,"durationMs":12,"userId":"user_123"}
```

## 初始化示例

```ts
import { LogLayer } from "loglayer";
import { serializeError } from "serialize-error";
import { LogFileRotationTransport } from "@loglayer/transport-log-file-rotation";
import {
  getSimplePrettyTerminal,
} from "@loglayer/transport-simple-pretty-terminal";

export const logger = new LogLayer({
  errorSerializer: serializeError,
  transport: [
    getSimplePrettyTerminal({
      enabled: process.env.NODE_ENV === "development",
      runtime: "node",
      viewMode: "expanded",
    }),
    new LogFileRotationTransport({
      enabled: process.env.NODE_ENV === "production",
      filename: "./logs/app-%DATE%.jsonl",
      frequency: "daily",
      auditFile: "./logs/.audit.json",
    }),
  ],
});
```

## Hono middleware 示例

```ts
import { createMiddleware } from "hono/factory";
import { logger } from "./index";

export const loggerMiddleware = () =>
  createMiddleware(async (c, next) => {
    const start = performance.now();
    const requestId = c.get("requestId");
    const method = c.req.method;
    const path = c.req.path;

    const reqLogger = logger.withContext({ requestId, method, path });
    c.set("logger", reqLogger);

    try {
      await next();

      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      reqLogger
        .withMetadata({
          status: c.res.status,
          durationMs,
          userId: c.get("user")?.id ?? null,
        })
        .info("request completed");
    } catch (error) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      reqLogger
        .withMetadata({
          status: c.res.status || 500,
          durationMs,
          userId: c.get("user")?.id ?? null,
        })
        .withError(error as Error)
        .error("request failed");

      throw error;
    }
  });
```

## 敏感信息脱敏

日志中禁止记录：

- `authorization`
- `cookie`
- `set-cookie`
- `password`
- `token`
- `secret`
- `verificationCode`
- OAuth provider token
- session token
- 其他 PII 密集字段

## OpenTelemetry

默认不启用完整 OpenTelemetry pipeline。

推荐：

- 日志字段预留 `trace_id`、`span_id`。
- 需要 trace correlation 时启用 LogLayer OpenTelemetry plugin。
- 真正需要集中式 tracing 时再接完整 OTel SDK。
