---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# Hono 后端模板工程文档

## 目标

设计一套基于 **Node.js + Hono + TypeScript + Drizzle + Better Auth + @hono/zod-openapi + Scalar + LogLayer** 的生产级后端项目模板。

核心目标：

- 使用 `features/<feature>` 垂直切片组织业务代码。
- 保持 `core/` 很薄，只放跨业务基础设施。
- 使用 `@hono/zod-openapi` 把路由、校验、OpenAPI 文档收敛到同一份契约。
- 使用统一响应 envelope 和错误码体系。
- 内置 Better Auth，但保持 `/api/auth/*` 原生响应边界。
- 使用 LogLayer 做结构化日志，开发环境 pretty console，生产环境 JSONL 按天轮转。
- 把文档、测试、OpenAPI、CI 作为模板的一等产物。

## 文档路由

入口：

- [Agent 工作指南](../AGENTS.md)
- [ADR 索引](adr/README.md)
- [文档系统规范](conventions/documentation-system.md)

| 目录 | 职责 |
| --- | --- |
| `docs/architecture/` | 当前架构事实、目录边界、请求生命周期和禁止模式 |
| `docs/conventions/` | API、响应、错误码、认证、数据库、日志、开发流程、测试和文档治理规范 |
| `docs/features/` | feature 文档模板和具体 feature 设计 |
| `docs/adr/` | 已接受的长期架构决策和取舍历史 |
| `docs/diagrams/` | 与架构或 feature 文档配套的 Mermaid 图 |
| `docs/checklists/` | 安全、可观测性等验收清单 |

## 按任务阅读

| 任务 | 先读 |
| --- | --- |
| 新增 feature | `docs/architecture/directory-structure.md`、`docs/conventions/development-workflow.md`、`docs/features/_template.md` |
| 新增 API | `docs/conventions/api-openapi.md`、`docs/conventions/response-envelope.md`、`docs/conventions/error-code-system.md`、`docs/conventions/testing-strategy.md` |
| 新增错误码 | `docs/conventions/error-code-system.md`、相关 feature 文档、`docs/conventions/testing-strategy.md` |
| 修改认证或权限 | `docs/conventions/auth-better-auth.md`、`docs/adr/0003-keep-better-auth-native.md`、相关 feature 文档 |
| 修改数据库 | `docs/conventions/database-drizzle.md`、`docs/conventions/development-workflow.md`、相关 feature 文档 |
| 排查日志或可观测性 | `docs/conventions/logging-loglayer.md`、`docs/conventions/ci-cd-security-observability.md`、`docs/checklists/observability-checklist.md` |
| 修改文档治理 | `AGENTS.md`、`docs/conventions/documentation-system.md`、本文件 |

## 当前事实、历史决策和验收清单

- 当前事实优先看 `docs/architecture/`、`docs/conventions/`，并用当前代码、OpenAPI、schema、测试或配置再次确认。
- 历史决策看 `docs/adr/`；ADR 说明为什么接受某个长期决策，但不能替代当前实现事实。
- 验收要求看 `docs/checklists/`；清单用于 review 和发布前检查，不替代具体规范。

## 当前文档目录

```txt
docs/
  README.md

  architecture/
    overview.md
    directory-structure.md
    request-lifecycle.md

  conventions/
    api-openapi.md
    response-envelope.md
    error-code-system.md
    auth-better-auth.md
    database-drizzle.md
    logging-loglayer.md
    documentation-system.md
    development-workflow.md
    testing-strategy.md
    ci-cd-security-observability.md

  features/
    _template.md

  adr/
    README.md
    0001-feature-slices.md
    0002-unified-response-envelope.md
    0003-keep-better-auth-native.md

  diagrams/
    request-lifecycle.mmd
    auth-flow.mmd
    error-flow.mmd

  checklists/
    security-checklist.md
    observability-checklist.md
```

未来可以按需要增加 `docs/plans/`、`docs/reports/`、`docs/references/`、`docs/archive/` 等扩展目录。未实际创建前，这些目录只代表治理建议，不代表当前事实。

## 规范级别

本文档中的建议分为三类：

- **强制规范**：模板默认必须遵守。
- **推荐规范**：默认建议采用，除非项目有明确反例。
- **可选增强**：适合后续按项目复杂度开启。
