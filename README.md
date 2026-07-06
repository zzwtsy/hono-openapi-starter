---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# Hono Backend Template Docs

这是一套 Hono 后端模板工程文档。

## 文档入口

- [Agent 工作指南](AGENTS.md)
- [文档地图](docs/README.md)
- [文档系统规范](docs/conventions/documentation-system.md)
- [ADR 索引](docs/adr/README.md)
- [架构总览](docs/architecture/overview.md)
- [最终目录结构](docs/architecture/directory-structure.md)
- [API 与 OpenAPI 规范](docs/conventions/api-openapi.md)
- [统一响应格式](docs/conventions/response-envelope.md)
- [错误码体系](docs/conventions/error-code-system.md)
- [Better Auth 集成](docs/conventions/auth-better-auth.md)
- [权限层规范](docs/conventions/authorization.md)
- [Drizzle 数据库规范](docs/conventions/database-drizzle.md)
- [LogLayer 日志规范](docs/conventions/logging-loglayer.md)
- [开发流程规范](docs/conventions/development-workflow.md)
- [注释规范](docs/conventions/commenting.md)
- [测试策略](docs/conventions/testing-strategy.md)
- [CI/CD、安全与可观测性](docs/conventions/ci-cd-security-observability.md)

## 推荐阅读顺序

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/architecture/overview.md`
4. `docs/architecture/directory-structure.md`
5. `docs/adr/README.md`
6. 与任务直接相关的 `docs/conventions/*.md`
7. 涉及 feature 时读 `docs/features/_template.md`
8. 涉及验收时读相关 `docs/checklists/*.md`
