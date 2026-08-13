---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-08-13
---

# ADR-0012：Home org 完整性与认证 schema 所有权

## Context

`user.orgId` 是权限检查、管理子树和数据隔离的 home org 根，但此前仅为可空文本列。服务层的“先检查组织、再创建用户或删除组织”不能封闭并发窗口：创建用户与删除组织交错时可能产生悬空 home org。

Better Auth CLI 能生成认证四表和 additional fields，却不拥有业务 `organizations` 模型。将跨文件业务外键塞入 Better Auth 配置会扩大认证层职责；继续把正式 schema 当作可覆盖生成物，则无法稳定表达数据库完整性约束。

## Decision

1. `organization-schema.ts` 独立定义 `organizations`，不依赖认证或授权 schema。`auth-schema.ts` 与 `authorization-schema.ts` 单向依赖它。
2. `auth-schema.ts` 是应用维护的正式 Drizzle schema。Better Auth CLI 通过 `auth:generate:reference` 只生成 `.cache/better-auth/auth-schema.ts`，用于升级时比较上游四表字段，不覆盖正式 schema。
3. Better Auth 运行时与 CLI 配置继续以 `orgId: { type: "string", required: false, input: false }` 声明适配器字段；不添加 `references`。`input: false` 保证客户端不能选择 home org，数据库约束不由 Better Auth 配置表达。
4. 数据库将 `user.org_id` 设为 `NOT NULL`，以 `ON DELETE RESTRICT` 外键引用 `organizations.id`，并建立 `user_org_id_idx`。模板按 greenfield 迁移：不回填 null 或悬空数据，存在脏数据时迁移失败。
5. 用户创建和调岗事务先以 `FOR KEY SHARE` 锁目标组织，再写 `user`；组织删除事务先以 `FOR UPDATE` 锁目标组织，再检查子组织和用户并删除。所有竞争路径遵守“组织锁在先”的顺序。
6. OpenAPI 的 `User.orgId` 与 `UserSummary.orgId` 是非空字符串。若认证运行时仍返回 null，视为数据库不变量或适配器映射损坏，返回 `COMMON_INTERNAL_ERROR`。

## Consequences

优点：

- 数据库在所有写入路径上阻止 null、未知组织和删除后悬空用户；
- 锁协议把常见并发竞争稳定映射为业务错误，外键作为最终兜底；
- Better Auth 仍只负责认证字段契约，组织模型及生命周期留在应用；
- 上游 schema 变化仍可通过参考生成物发现，且不会覆盖应用约束。

代价：

- 升级 Better Auth 时需要人工比较参考 schema 并显式合并字段变化；
- 旧库若存在 null 或悬空 `org_id`，migration 会失败，必须在迁移前由部署方处理；
- `required: false` 的认证类型仍可能要求边界处保留防御性空值检查，数据库与业务 API 则坚持非空不变量。

## Non-goals

- 唯一系统根组织或限制新建多个根；
- 分级管理员与目标组织 PEP；
- 角色治理、用户多 home 或组织切换。

## Verification

- fresh database 执行全部 migration；null 与未知组织用户插入失败；
- service 删除有用户组织返回 `ORG_HAS_USERS`，直接删除被外键拒绝；
- 创建/调岗与组织删除的并发锁测试不产生孤儿用户或裸 PostgreSQL 500；
- bootstrap、development seed、登录、session、`/api/v1/me` 和前端生成类型回归。

## Related

- [ADR-0004：权限层自建，不扩展 Better Auth](0004-authorization-layer.md)
- [Better Auth 集成](../conventions/backend/auth-better-auth.md)
- [Drizzle 数据库规范](../conventions/backend/database-drizzle.md)
- [IAM feature](../features/backend/iam.md)
