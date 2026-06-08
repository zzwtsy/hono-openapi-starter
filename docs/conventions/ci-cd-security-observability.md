---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# CI/CD、安全与可观测性

## CI 阶段

推荐 pipeline：

1. install
2. typecheck
3. lint
4. format check
5. boundary lint
6. unit tests
7. route tests
8. integration tests
9. OpenAPI generate
10. OpenAPI lint
11. OpenAPI validate
12. SDK generation smoke test
13. build
14. deploy

## OpenAPI CI

最低要求：

```txt
generate openapi.json
redocly lint
spectral lint
openapi-generator validate
```

推荐额外做一次 SDK generation smoke test。

## 数据库迁移发布

使用 expand / contract 策略：

1. expand：新增兼容字段/表。
2. dual write：必要时双写。
3. backfill：回填历史数据。
4. switch read：切换读取路径。
5. contract：删除旧字段/旧路径。

生产环境禁止在部署时临时 `push` schema。

## API versioning

默认使用路径级 major version：

```txt
/api/v1
/api/v2
```

规则：

- 同一 major 内只做向后兼容变更。
- 破坏性变更进入新 major。
- 旧 major 需要 deprecation 策略。
- OpenAPI 和 docs 同步标注废弃接口。

## 安全默认项

| 项目 | 级别 |
| --- | --- |
| 环境变量启动校验 | 强制 |
| `X-Request-Id` | 强制 |
| secure headers | 强制 |
| CORS allowlist | 强制 |
| body limit | 强制 |
| Better Auth trusted origins | 强制 |
| Better Auth secret rotation | 推荐 |
| Better Auth rate limit | 强制 |
| 日志脱敏 | 强制 |
| RBAC/permissions | 推荐 |
| audit log | 推荐 |
| idempotency key | 可选 |
| CSRF for business forms | 可选 |

## 可观测性

默认应包含：

- request log
- error log
- requestId correlation
- `/healthz`
- `/readyz`
- JSONL 日志
- OpenAPI 文档
- trace_id/span_id 预留字段

## health/readiness

推荐：

```txt
GET /healthz
GET /readyz
```

`/healthz`：

- 只检查进程是否可响应。

`/readyz`：

- 检查数据库连接。
- 检查关键依赖。
- 可用于部署平台 readiness probe。

## Idempotency Key

可选增强。

适合：

- 创建订单
- 发起支付
- 提交审批
- 发送邮件
- 任何有明显副作用的 POST

不建议默认加到所有 CRUD。
