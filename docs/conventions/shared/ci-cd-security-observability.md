---
status: Active
owner: backend-platform
lastReviewedAt: 2026-08-19
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
- `backend`：后端 typecheck、`test:all`（unit/integration/contract），并生成、静态校验 portable production release；
- `frontend`：前端 typecheck、test 和 build。

三个 job 都使用 15 分钟超时、只读 `contents` 权限，并禁止 checkout 持久化凭据。PR 同一编号的新运行会取消旧运行；main push 不互相取消，避免主分支留下未验证状态。pnpm store 由 `actions/setup-node` 缓存，不缓存完整 `node_modules`。

真实浏览器门禁独立于快速质量流水线，见 `.github/workflows/e2e.yml`：

- PR 和 main push 运行 Chromium；
- 每周定时运行 Chromium、Firefox、WebKit；
- 每个浏览器矩阵 job 在下载浏览器前先执行 E2E workspace typecheck 和无需 Docker/浏览器的 runner lifecycle 单测；
- runner 在仓库外生成 backend release，使用 release 内的 compiled migration/seed/server 与 Testcontainers 临时 PostgreSQL，构建前端 Vite preview，再运行代表性认证、授权、Dashboard 和项目 CRUD 哨兵流程；
- 上传 `playwright-report`、`test-results`（screenshot/trace/video）和独立的 `service-logs`（backend/Vite），便于定位浏览器、前端或后端链路问题；服务日志不放进 Playwright 会清理的 outputDir。

E2E 不并入根 `pnpm test`，避免 Docker 和浏览器启动成本拖慢本地快速回路；模板仍在开发期，因此只锁定跨层高价值基线，不把全部业务页面固化为长期门禁。

## Actions 运行记录清理

`.github/workflows/cleanup-action-runs.yml` 每周一在 E2E 定时任务之后删除已完成且超过 30 天的 workflow runs，单次最多处理 GitHub API 返回的 100 条记录。它与 artifact/log retention 是两个边界：E2E 上传产物保留 14 天；清理任务删除满足条件的整条 run 及其关联日志和 artifacts。

该 workflow 也支持手动触发，默认 `dry_run=true`，只输出 `would-delete` 候选项；明确改为 `false` 才执行删除。定时任务直接清理，且只查询 `completed`，因此不会触碰排队、执行中或当前清理任务。删除不可恢复，30 天窗口内应完成必要排障。

该 workflow 是现有只读 CI/E2E 权限的明确例外：它需要 `actions: write` 调用 GitHub REST API，但 `contents` 仍为只读，且不响应 push 或 pull request，避免 PR 代码获得写权限执行机会。实现直接使用 runner 预装的 `gh`，不 checkout 仓库，也不引入第三方清理 Action。

第三方 Actions 固定到对应 major tag 当前解引用后的完整 commit SHA，行尾注释保留可读版本。`.github/dependabot.yml` 每周检查 `github-actions` 更新并把同批更新归组，避免 SHA 固定后失去自动升级路径。

后端 build 与 production package 是两个门禁：build 以 Node.js 24 对应的 `ES2024` target 和受控 `ESNext.*` lib 编译，启用 `noEmitOnError`，并验证 clean dist、source map、alias 重写、已发射本地 import 的目标完整性和 migration 资源；`pnpm package:backend` 再用 `pnpm deploy --prod` 生成带隔离 production dependencies 的 portable release。产物只允许 runtime 文件与 pnpm package metadata，不携带 `.env`、日志、源码或测试，也不安装 devDependencies；release manifest 的 `engines.node` 必须与仓库根运行时契约一致。依赖解析阶段只修正 Better Auth 1.6.23 中与后端运行无关的 `vitest`、`drizzle-kit` optional peer；release 校验必须拒绝测试、编译和前端构建工具链，并用 package instance 上限阻止同类依赖图回归。E2E 必须从仓库外的临时 release 启动，避免向上解析 workspace 依赖而产生假通过。

仍未实现：独立 route tests、通用 OpenAPI lint/validate、外部 SDK smoke test 和实际 deploy（模板无部署目标）。CI 生成 release 只证明产物可发布，不上传长期制品、不选择环境也不执行切流；OpenAPI 静态导出和已提交前端生成物一致性已经是强制门禁，不能再描述为“未生成”。

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

生产 migration 使用候选 release 内的 compiled command，在应用切流前由独立 release job 执行一次；禁止把 migration 放进每个应用副本的 startup。首次 bootstrap 也使用同一 release，但只在空环境人工执行，成功后移除 bootstrap password。

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
