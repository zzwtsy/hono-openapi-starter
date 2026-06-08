---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# ADR 索引

ADR 记录已经接受的长期架构决策。它说明决策背景、取舍和后果，但不能替代当前代码、OpenAPI、数据库 schema 或最新规范。

## 决策列表

| ADR | 状态 | 核心决策 | 关联文档 |
| --- | --- | --- | --- |
| [ADR-0001: 使用 features 垂直切片架构](0001-feature-slices.md) | Accepted | 业务代码默认放在 `src/features/<feature>`，复杂 feature 可继续拆分 `api/application/domain/infrastructure/lib`。 | [架构总览](../architecture/overview.md)、[目录结构](../architecture/directory-structure.md) |
| [ADR-0002: 业务 API 使用统一响应 Envelope](0002-unified-response-envelope.md) | Accepted | 业务 API 成功和错误响应都使用统一 envelope。 | [统一响应格式](../conventions/response-envelope.md)、[错误码体系](../conventions/error-code-system.md) |
| [ADR-0003: Better Auth 原生端点不套业务响应 Envelope](0003-keep-better-auth-native.md) | Accepted | `/api/auth/*` 保持 Better Auth 原生响应，业务 API 继续使用统一 envelope。 | [Better Auth 集成](../conventions/auth-better-auth.md)、[统一响应格式](../conventions/response-envelope.md) |

## 维护规则

- ADR 原则上不删除，也不直接改写历史决策。
- 如果新决策替代旧决策，新增 ADR，并在旧 ADR 的 frontmatter 中标记 `supersededBy`。
- 阅读 ADR 后必须回到当前事实，检查相关代码、OpenAPI、schema、测试和 conventions 是否仍然一致。
