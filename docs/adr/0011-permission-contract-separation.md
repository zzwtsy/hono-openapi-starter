---
status: Active
adrStatus: Accepted
owner: platform
lastReviewedAt: 2026-08-07
---

# ADR-0011：权限 code 与展示元数据分离

## Context

快速开发阶段把权限机器身份、中文名称和数据库展示字段放在同一模型中，造成以下问题：

- 授权核心需要理解展示字段，`PermissionName`、资源 label 和业务权限清单互相耦合；
- API、数据库和前端分别使用 `permission`、`name`、`permissions` 等不同字段；
- 数据库保存无授权意义的 label、description 和时间字段，权限目录同步同时承担展示数据生命周期；
- 前端只能再次拆分 code 或维护映射，容易与后端漂移。

这是一个仍在开发中的模板项目，不保留旧字段或旧 API 兼容层。

## Decision

1. `PermissionCode` 是唯一机器身份。`PermissionChecker`、`PermissionService`、`requirePermission`、缓存和授权表只处理 code。
2. feature 使用 `definePermissionCatalog()` 一次声明 resource/action 与 label。builder 自动生成 code，并校验 segment 格式和 label；每个 feature 通过 declaration merging 注册完整数组 slot。
3. `PermissionDefinition` 与 `PermissionRef` 统一包含 `code`、`resourceCode`、`actionCode`、`resourceLabel`、`label`。`PermissionRef` 只在 HTTP presenter 和展示型 API 中出现。
4. 数据库 `permissions` 是 code-only 外键 registry：`permissions(code PK)`，关联字段统一为 `permission_code`，权限外键 `ON DELETE RESTRICT`。catalog 外 code 无引用时启动同步清理，有引用时启动失败；同步不删除任何授权关系。
5. API 使用 `permissionCode`/`permissionCodes` 命名；`/me` 返回 `permissionCodes`，展示型响应返回 `permission: PermissionRef`。已知权限输入由 catalog 派生 OpenAPI enum；HTTP 未知 code 返回 400，内部未知 code 返回 `PERMISSION_NOT_FOUND` 或导致启动失败。
6. 不引入 `labelKey`、多语言权限目录、权限生命周期或旧 API 双读/双写；Better Auth 认证边界、组织继承、多角色并集、allow/deny、过期和请求级缓存保持不变。

## Consequences

优点：

- 授权层只理解稳定、可比较的 code，核心概念更少；
- API 展示字段有唯一 presenter 来源，前端无需复制权限映射；
- catalog、OpenAPI enum、DB registry 和类型检查共享同一份 feature 声明；
- 删除或重命名 code 时，启动同步会显式暴露仍存在的授权引用。

代价：

- 一次性 migration 和 API 字段变更会破坏现有开发数据；模板项目接受该成本，不做兼容迁移；
- 新 feature 必须同时注册 catalog slot 并在组装点汇总；
- catalog 外的 DB code 不能静默带着授权关系继续运行。

## Verification

- builder、catalog 唯一性与 registry 覆盖测试；
- code-only migration、stale code 清理/引用失败测试；
- 组织继承、多角色、allow/deny、过期和缓存回归测试；
- 未知 code 的 HTTP 400、OpenAPI 字段和前端生成类型测试。

## Related

- [权限层规范](../conventions/backend/authorization.md)
- [IAM feature](../features/backend/iam.md)
- [ADR-0004：权限层自建，不扩展 Better Auth](0004-authorization-layer.md)
