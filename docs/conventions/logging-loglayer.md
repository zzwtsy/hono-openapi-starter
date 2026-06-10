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
| `req.method` | HTTP 方法 |
| `req.url` | 请求路径 |
| `req.remoteAddress` | 客户端地址，优先来自 `x-forwarded-for`，其次 `x-real-ip` |
| `res.statusCode` | HTTP 状态码 |
| `responseTime` | 请求耗时，单位毫秒 |

错误日志额外字段：

| 字段 | 说明 |
| --- | --- |
| `code` | 业务错误码 |
| `status` | HTTP 状态码 |
| `type` | 错误类型 |
| `stack` | 错误栈 |
| `cause` | 原始错误原因 |

## JSONL 示例

```json
{"ts":"2026-06-03T12:00:00.000Z","level":"info","msg":"request completed","requestId":"req_123","req":{"method":"GET","url":"/api/v1/users","remoteAddress":"127.0.0.1"},"res":{"statusCode":200},"responseTime":12}
```

## 初始化示例

```ts
import { honoLogLayer } from "@loglayer/hono";
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
import { honoLogLayer } from "@loglayer/hono";
import { logger } from "./index";
import { resolveRequestId } from "../http/request-id-middleware";

export const loggerMiddleware = () =>
  honoLogLayer({
    instance: logger,
    requestId: resolveRequestId,
    autoLogging: {
      request: false,
      response: true,
    },
  });
```

错误日志由统一 `errorHandler` 记录，复用 request-scoped logger：

```ts
c.var.logger
  .withMetadata({
    requestId: c.get("requestId"),
    req: { method: c.req.method, url: c.req.path },
    res: { statusCode },
    status: statusCode,
    code,
    type,
  })
  .withError(error)
  .error("request failed");
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
