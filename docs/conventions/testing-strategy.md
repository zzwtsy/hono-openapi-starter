---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# 测试策略

## 测试分层

| 类型 | 目标 |
| --- | --- |
| unit test | use-case、policy、mapper、response helper |
| route test | HTTP status、headers、envelope、auth gating |
| integration test | feature + real DB |
| database test | repository、transaction、migration 后行为 |
| auth test | sign-up、sign-in、session、requireAuth |
| contract test | OpenAPI 生成与契约稳定性 |
| error response test | 错误码映射与 envelope |
| logging test | requestId、脱敏、JSON shape |

## 推荐工具

- Vitest
- Hono `app.request()`
- Hono `testClient()`，仅在类型化测试价值明确时使用
- Drizzle test helper
- test database 或容器化数据库

## route test

主推：

```ts
const res = await app.request("/api/v1/users", {
  method: "GET",
  headers: {
    Authorization: "Bearer test",
  },
});
```

测试点：

- status
- `X-Request-Id`
- response envelope
- error code
- auth middleware
- validation error

## feature 内测试与全局 tests 分工

feature 内放：

```txt
features/users/
  users.test.ts
```

适合：

- service unit test
- repository integration test
- route test

全局 `tests/` 放：

```txt
tests/
  helpers/
  contract/
  integration/
  route/
  e2e/
```

适合：

- OpenAPI contract test
- 跨 feature integration
- e2e
- test helpers

## OpenAPI contract test

必须检查：

1. `openapi.json` 可以生成。
2. 文档能通过 lint。
3. 所有业务 route 都有 operationId。
4. 所有业务 route 都有 tags。
5. 所有业务 route 都有 response schema。
6. 统一 envelope schema 没有漂移。

## Error response test

至少覆盖：

- validation failed
- unauthorized
- forbidden
- not found
- conflict
- rate limited
- internal error

## Logging test

只测关键 contract：

- requestId 已写入日志。
- 敏感字段已脱敏。
- 生产 JSONL 每行都是合法 JSON。
- request log 包含 `req`、`res`、`responseTime`。
- 错误日志包含 `code`、`status`、`type`、`requestId`。

不要对 pretty console 输出做重快照。
