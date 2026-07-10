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

## Hono 中间件集成

使用 `@loglayer/hono` 官方集成创建 request-scoped logger 并记录 pino-http 风格访问日志。官方集成内部基于 `child()` 隔离每个请求的 logger，避免直接 `logger.withContext()` 污染全局单例导致的并发串号问题。

```ts
import { honoLogLayer } from "@loglayer/hono";
import { logger } from "./index";
import { resolveRequestId } from "../http/request-id-middleware";

app.use("*", honoLogLayer({
  instance: logger,
  requestId: resolveRequestId,
  autoLogging: {
    request: false,
    response: true,
  },
}));
```

集成后 `c.var.logger` 即为带 `requestId`/`method`/`path` 上下文的请求级 logger，feature handler 与错误处理直接复用。

注意：

- `await next()` 不会抛错（Hono 把异常转成 Response 回灌 `c.res`），访问日志中间件**不要**用 `try/catch next` 兜底；错误日志统一在 `app.onError` 里用 `c.var.logger.withError(err).error(...)` 写。
- `resolveRequestId` 用 `WeakMap<Request, string>` 缓存，保证中间件与 logger 集成共用同一个 requestId。

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
