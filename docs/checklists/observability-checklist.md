---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# 可观测性 Checklist

## 日志

- [ ] request log 包含 method/path/status/durationMs/requestId。
- [ ] error log 包含 code/status/stack/requestId。
- [ ] userId 在认证后写入日志上下文。
- [ ] JSONL 每行都是合法 JSON。
- [ ] 生产日志按天轮转。
- [ ] 日志脱敏规则有测试覆盖。

## 请求追踪

- [ ] 请求头支持 `X-Request-Id`。
- [ ] 响应头返回 `X-Request-Id`。
- [ ] 响应体返回 `meta.requestId`。
- [ ] 日志返回 `requestId`。
- [ ] 预留 `trace_id` 和 `span_id` 字段。

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
