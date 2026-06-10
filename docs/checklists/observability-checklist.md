---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# 可观测性 Checklist

## 日志

- [ ] request log 包含 `requestId`、`req.method`、`req.url`、`res.statusCode`、`responseTime`。
- [ ] error log 包含 `code`、`status`、`type`、`stack`、`requestId`、`req`、`res`。
- [ ] 认证后需要写用户维度日志时，通过 request-scoped logger 写入结构化 metadata。
- [ ] JSONL 每行都是合法 JSON。
- [ ] 生产日志按天轮转。
- [ ] 日志脱敏规则有测试覆盖。

## 请求追踪

- [ ] 请求头支持 `X-Request-Id`。
- [ ] 响应头返回 `X-Request-Id`。
- [ ] 响应体返回 `meta.requestId`。
- [ ] 日志返回 `requestId`。
- [ ] 需要 trace correlation 时启用 LogLayer OpenTelemetry plugin 写入 trace/span 字段。

## 健康检查

- [ ] `/healthz` 可用。
- [ ] `/readyz` 可用。
- [ ] readiness 检查数据库连接。
- [ ] readiness 不暴露敏感内部细节。

## 文档与契约

- [ ] `/openapi.json` 可生成。
- [ ] `/reference` 可访问。
- [ ] OpenAPI lint 进入 CI。
- [ ] contract test 覆盖核心接口。
