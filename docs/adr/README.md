---
status: Active
owner: platform
lastReviewedAt: 2026-07-10
---

# ADR 索引

ADR 记录已经接受的长期架构决策。它说明决策背景、取舍和后果，但不能替代当前代码、OpenAPI、数据库 schema 或最新规范。

## 决策列表

| ADR | 状态 | 核心决策 | 关联文档 |
| --- | --- | --- | --- |
| [ADR-0001: 使用 features 垂直切片架构](0001-feature-slices.md) | Accepted | 业务代码默认放在 `src/features/<feature>`，复杂 feature 可继续拆分 `api/application/domain/infrastructure/lib`。 | [架构总览](../architecture/overview.md)、[目录结构](../architecture/backend/directory-structure.md) |
| [ADR-0002: 业务 API 使用统一响应 Envelope](0002-unified-response-envelope.md) | Accepted | 业务 API 成功和错误响应都使用统一 envelope。 | [统一响应格式](../conventions/backend/response-envelope.md)、[错误码体系](../conventions/backend/error-code-system.md) |
| [ADR-0003: Better Auth 原生端点不套业务响应 Envelope](0003-keep-better-auth-native.md) | Accepted | `/api/auth/*` 保持 Better Auth 原生响应，业务 API 继续使用统一 envelope。 | [Better Auth 集成](../conventions/backend/auth-better-auth.md)、[统一响应格式](../conventions/backend/response-envelope.md) |
| [ADR-0004: 权限层自建，不扩展 Better Auth](0004-authorization-layer.md) | Accepted | 权限层（组织树+RBAC+直接授权+过期+deny）自建为独立模块，不做 Better Auth 插件，Better Auth 只管认证。 | [权限层规范](../conventions/backend/authorization.md)、[Better Auth 集成](../conventions/backend/auth-better-auth.md) |
| [ADR-0005: 前端 API 生成工具选型](0005-frontend-wormhole-selection.md) | Accepted | 选 @alova/wormhole（成熟），排除 worma（0.0.1 早期）。 | [前端 API 规范](../conventions/frontend/api-alova.md) |
| [ADR-0006: 前端架构](0006-frontend-architecture.md) | Accepted | 垂直切片 + TanStack Router 守卫 + alova + Better Auth client。 | [前端目录结构](../architecture/frontend/directory-structure.md)、[前端路由](../conventions/frontend/routing.md) |
| [ADR-0007: 运行时配置控制 via DB + Better Auth hooks](0007-runtime-config-control.md) | Accepted | 运行时可编辑配置存 DB `system_settings` 表；sign-up 永久拒绝用 BA `hooks.before`（signUp 开关已退役）；禁用用户用 `databaseHooks.session.create.before`；用户管理自建不引 admin 插件。 | [ADR-0003](0003-keep-better-auth-native.md)、[ADR-0004](0004-authorization-layer.md)、[Better Auth 集成](../conventions/backend/auth-better-auth.md) |
| [ADR-0008: 错误处理 i18n 演进](0008-error-i18n.md) | Accepted | code/message 分离 + 通用+业务码 + i18n 自建字典(Accept-Language)+ originalMessage en 兜底。 | [ADR-0002](0002-unified-response-envelope.md)、[错误码体系](../conventions/backend/error-code-system.md) |

## 维护规则

- ADR 原则上不删除，也不直接改写历史决策。
- 如果新决策替代旧决策，新增 ADR，并在旧 ADR 的 frontmatter 中标记 `supersededBy`。
- 阅读 ADR 后必须回到当前事实，检查相关代码、OpenAPI、schema、测试和 conventions 是否仍然一致。
