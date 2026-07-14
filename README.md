---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-14
---

# Hono Backend Template Docs

这是一套 Hono 后端模板工程文档。

## 文档入口

- [Agent 工作指南](AGENTS.md)
- [文档地图](docs/README.md)
- [文档系统规范](docs/conventions/shared/documentation-system.md)
- [ADR 索引](docs/adr/README.md)
- [架构总览](docs/architecture/overview.md)
- [后端目录结构](docs/architecture/backend/directory-structure.md)
- [前端目录结构](docs/architecture/frontend/directory-structure.md)
- [API 与 OpenAPI 规范](docs/conventions/backend/api-openapi.md)
- [统一响应格式](docs/conventions/backend/response-envelope.md)
- [错误码体系](docs/conventions/backend/error-code-system.md)
- [Better Auth 集成](docs/conventions/backend/auth-better-auth.md)
- [权限层规范](docs/conventions/backend/authorization.md)
- [Drizzle 数据库规范](docs/conventions/backend/database-drizzle.md)
- [LogLayer 日志规范](docs/conventions/backend/logging-loglayer.md)
- [后端开发流程规范](docs/conventions/backend/development-workflow.md)
- [前端开发流程规范](docs/conventions/frontend/development-workflow.md)
- [注释规范](docs/conventions/shared/commenting.md)
- [测试策略](docs/conventions/backend/testing-strategy.md)
- [CI/CD、安全与可观测性](docs/conventions/shared/ci-cd-security-observability.md)

## 推荐阅读顺序

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/architecture/overview.md`
4. `docs/architecture/backend/directory-structure.md`(后端)或 `docs/architecture/frontend/directory-structure.md`(前端)
5. `docs/adr/README.md`
6. 与任务直接相关的 `docs/conventions/{shared,backend,frontend}/*.md`
7. 涉及 feature 时读 `docs/features/backend/_template.md`(后端)或 `docs/features/frontend/_template.md`(前端)
8. 涉及验收时读相关 `docs/checklists/*.md`
