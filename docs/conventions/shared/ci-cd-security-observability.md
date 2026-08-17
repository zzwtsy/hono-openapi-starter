---
status: Active
owner: backend-platform
lastReviewedAt: 2026-08-17
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

实际 CI（`.github/workflows/ci.yml`，push main + PR 触发）使用三个并行 job：

- `quality`：工具脚本测试、正式文档 frontmatter/链接、OpenAPI → Wormhole 生成物一致性和全仓 lint（含 boundary + format）；
- `backend`：后端 typecheck、`test:all`（unit/integration/contract）和 build；
- `frontend`：前端 typecheck、test 和 build。

三个 job 都使用 15 分钟超时、只读 `contents` 权限，并禁止 checkout 持久化凭据。PR 同一编号的新运行会取消旧运行；main push 不互相取消，避免主分支留下未验证状态。pnpm store 由 `actions/setup-node` 缓存，不缓存完整 `node_modules`。

第三方 Actions 固定到对应 major tag 当前解引用后的完整 commit SHA，行尾注释保留可读版本。`.github/dependabot.yml` 每周检查 `github-actions` 更新并把同批更新归组，避免 SHA 固定后失去自动升级路径。

未实现：独立 route tests、通用 OpenAPI lint/validate、外部 SDK smoke test 和 deploy（模板无部署目标）。OpenAPI 静态导出和已提交前端生成物一致性已经是强制门禁，不能再描述为“未生成”。

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
