---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-08
---

# 可观测性 Checklist

## 日志

- [x] request log 包含 method/path/status/durationMs/requestId。
- [x] error log 包含 code/status/stack/requestId。
- [x] userId 在认证后写入日志上下文 - requireAuth 认证成功后用 `c.var.logger.getContextManager().appendContext({ userId })` 原地追加到请求级 child logger 的 context manager,业务日志与 access log(同一 childLogger)均带 userId。不用 withContext():其 polymorphic this 在 typescript-eslint 退化为 ILogLayer<any> 触发 ts/no-unsafe-argument;不用 contextFn:签名只给 {request,path} 且在 auth 之前执行。未认证请求不追加(合理);honoLogLayer 未挂时(如单元测试)跳过,不影响认证。
- [x] JSONL 每行都是合法 JSON。
- [x] 生产日志按天轮转。
- [x] 日志脱敏规则有测试覆盖。

## 请求追踪

- [x] 请求头支持 `X-Request-Id`。
- [x] 响应头返回 `X-Request-Id`。
- [x] 响应体返回 `meta.requestId`。
- [x] 日志返回 `requestId`。
- [ ] 预留 `trace_id` 和 `span_id` 字段。

## 健康检查

- [x] `/healthz` 可用。
- [x] `/readyz` 可用。
- [x] readiness 检查数据库连接。
- [x] readiness 不暴露敏感内部细节。

## 文档与契约

- [x] `/openapi.json` 可生成。
- [x] `/reference` 可访问。
- [ ] OpenAPI lint 进入 CI。
- [x] contract test 覆盖核心接口。
