---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-07
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
- testcontainers(容器化 PG,见 [集成测试基础设施](#集成测试基础设施))

## 集成测试基础设施

集成测试用 [testcontainers](https://node.testcontainers.org/) 起一次性 PG 容器,跑真实 migration,验证 SQL 行为(递归 CTE、外键、索引)。不 mock db,测试行为与生产一致。

### vitest projects 分离

`vitest.config.ts` 用 projects 分离 unit / integration:

- `unit`:`src/**/*.test.ts`,不起容器(默认 `pnpm test`,无需 Docker)
- `integration`:`src/**/*.integration.test.ts`,globalSetup 起容器(`pnpm test:integration`,需 Docker)

命名约定:集成测试文件名必须以 `.integration.test.ts` 结尾,才会被 integration project 拾取。

### scripts

- `pnpm test`:只跑 unit(无需 Docker)
- `pnpm test:integration`:只跑 integration(需 Docker)
- `pnpm test:all`:全跑

### globalSetup

`src/test/global-setup.ts`:

- 起 `PostgreSqlContainer("postgres:16-alpine")`
- 把容器连接串写入 `process.env.DATABASE_URL`,让全局 `db`(`db/client.ts`)自动连容器
- 设置 `EnvSchema` 其余必需 env(测试专用值),让 `env.ts` 校验通过——不依赖 `.env.test` 文件
- 跑 drizzle `migrate`(独立 client,跑完关闭)
- teardown 停容器

### resetDb

`src/test/db.ts` 的 `resetDb()`:TRUNCATE 所有业务表(Better Auth 4 表 + 权限层 6 表)CASCADE。集成测试每个 case 前 `beforeEach` 调用,保证隔离。

### 写集成测试

集成测试直接 `import { db } from "../../db/client.js"` 做 seed,调被测函数。`checkPermission` 用全局 `db`(连容器),无需 vi.mock。参考 `src/core/authorization/check.integration.test.ts`。

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
- 错误日志包含 code/status/requestId。

不要对 pretty console 输出做重快照。
