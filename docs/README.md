---
status: Active
owner: platform
lastReviewedAt: 2026-07-16
---

# 全栈模板工程文档

## 目标

设计一套基于 monorepo 的生产级全栈模板：

- **后端**：Node.js + Hono + TypeScript + Drizzle + Better Auth + @hono/zod-openapi + Scalar + LogLayer
- **前端**：React + TanStack Router + alova + @alova/wormhole + Better Auth client + Base UI（shadcn）
- **共享**：`packages/*`（自定义 eslint 规则、前后端共享依赖，按需）

核心目标：

- 前后端均使用 `features/<feature>` 垂直切片组织业务代码。
- 后端 `core/` 薄，只放跨业务基础设施；前端 `routes/` 薄装配，`features/` 能力层。
- 后端 `@hono/zod-openapi` 把路由、校验、OpenAPI 文档收敛到同一份契约；前端 `@alova/wormhole` 从 OpenAPI 自动生成类型安全 API。
- 使用统一响应 envelope 和错误码体系（后端定义，前端剥离）。
- 内置 Better Auth 认证（cookie/bearer），前端走 Better Auth client。
- 把文档、测试、OpenAPI、CI 作为模板的一等产物。

## 文档路由

入口：

- [Agent 工作指南](../AGENTS.md)
- [ADR 索引](adr/README.md)
- [文档系统规范](conventions/shared/documentation-system.md)

| 目录 | 职责 |
| --- | --- |
| `docs/architecture/` | 当前架构事实：`overview`（整体）+ `backend`/`frontend` 目录边界与请求生命周期 |
| `docs/conventions/` | 执行规范：`shared`（项目级）+ `backend` + `frontend` |
| `docs/features/` | feature 文档模板和具体 feature 设计：`backend`/`frontend` |
| `docs/packages/` | `packages/*` 共享包文档（自定义 eslint 规则、共享依赖） |
| `docs/adr/` | 已接受的长期架构决策和取舍历史 |
| `docs/diagrams/` | 与架构或 feature 文档配套的 Mermaid 图 |
| `docs/checklists/` | 安全、可观测性等验收清单 |

## 按任务阅读

| 任务 | 先读 |
| --- | --- |
| 新增后端 feature | `architecture/backend/directory-structure.md`、`conventions/backend/development-workflow.md`、`features/backend/_template.md` |
| 新增前端 feature | `architecture/frontend/directory-structure.md`、`conventions/frontend/development-workflow.md`、`features/frontend/_template.md` |
| 新增后端 API | `conventions/backend/api-openapi.md`、`conventions/backend/response-envelope.md`、`conventions/backend/error-code-system.md`、`conventions/backend/testing-strategy.md` |
| 前端调用 API | `conventions/frontend/api-alova.md`、`conventions/frontend/routing.md` |
| 修改前端 IAM | `features/frontend/iam.md`、`conventions/frontend/routing.md`、`conventions/frontend/state-cache.md` |
| 改用户管理 UI | `features/frontend/iam.md`（用户管理节）、`features/backend/iam.md`（users.*） |
| 改系统设置 / 注册开关 | `features/backend/system-settings.md`、`features/frontend/settings.md`、`adr/0007-runtime-config-control.md` |
| 修改认证或权限 | `conventions/backend/auth-better-auth.md`、`conventions/backend/authorization.md`、`conventions/frontend/auth.md`、`adr/0003-keep-better-auth-native.md`、`adr/0004-authorization-layer.md`、`adr/0007-runtime-config-control.md`、`checklists/iam-completeness-checklist.md` |
| 评估 / 演进 IAM 模板完成度 | `checklists/iam-completeness-checklist.md`、`conventions/backend/authorization.md`、`features/backend/iam.md` |
| 修改数据库 | `conventions/backend/database-drizzle.md`、`conventions/backend/development-workflow.md` |
| 前端路由守卫 | `conventions/frontend/routing.md`、`architecture/frontend/request-lifecycle.md` |
| 排查日志或可观测性 | `conventions/shared/ci-cd-security-observability.md`、`checklists/observability-checklist.md` |
| 安全验收 | `checklists/security-checklist.md` |
| 修改文档治理 | `AGENTS.md`、`conventions/shared/documentation-system.md`、本文件 |

## 当前事实、历史决策和验收清单

- 当前事实优先看 `architecture/`、`conventions/`，并用当前代码、OpenAPI、schema、测试或配置再次确认。
- 历史决策看 `adr/`；ADR 说明为什么接受某个长期决策，不能替代当前实现事实。
- 验收要求看 `checklists/`；清单用于 review 和发布前检查，不替代具体规范。

## 当前文档目录

```txt
docs/
  README.md

  architecture/
    overview.md
    backend/{directory-structure, request-lifecycle}.md
    frontend/{directory-structure, request-lifecycle}.md

  conventions/
    shared/{commenting, documentation-system, ci-cd-security-observability}.md
    backend/{api-openapi, response-envelope, error-code-system, auth-better-auth, authorization, database-drizzle, logging-loglayer, development-workflow, testing-strategy}.md
    frontend/{api-alova, routing, auth, state-cache, development-workflow, testing}.md

  features/
    backend/{_template, iam, projects, system-settings}.md
    frontend/{_template, iam, projects, settings}.md

  packages/_template.md

  adr/
    README.md
    0001-feature-slices.md
    0002-unified-response-envelope.md
    0003-keep-better-auth-native.md
    0004-authorization-layer.md
    0005-frontend-wormhole-selection.md
    0006-frontend-architecture.md
    0007-runtime-config-control.md

  diagrams/

  checklists/
    security-checklist.md
    observability-checklist.md
    iam-completeness-checklist.md
```

## 规范级别

- **强制规范**：模板默认必须遵守。
- **推荐规范**：默认建议采用，除非项目有明确反例。
- **可选增强**：适合后续按项目复杂度开启。
