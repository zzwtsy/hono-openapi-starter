---
status: Review
adrStatus: Proposed
date: 2026-08-06
owner: backend-platform
lastReviewedAt: 2026-08-06
relatedADR:
  - docs/adr/0009-audit-log.md
relatedCode:
  - apps/backend/src/core/audit
  - apps/backend/src/app/audit-policies.ts
  - apps/backend/src/features/audit
  - apps/backend/src/db/schema/audit-schema.ts
  - apps/frontend/src/features/audit
---

# ADR-0010：审计日志模板边界与发布策略

## Status

Review。本文记录阶段 1～5 在 ADR-0009 基础上的模板化收口，等待评审后再转为 Active。

## Context

ADR-0009 已确定自建 `core/audit`、声明式 `audit()` 中间件、异步 best-effort 写入、写操作与认证事件范围、资源可见性和 JSONB 历史快照。本轮实现进一步收口了 action、快照、资源解析、查询 DTO、队列生命周期和前端契约，但这些约束分散在代码、测试和 feature 文档中，发布时还需要明确：

- `core/audit` 如何保持业务无关，应用层如何装配 action、资源名称和可见性；
- 发生时间与入库时间、快照版本和队列丢弃之间的语义边界；
- 全局取证详情与资源时间线最小 DTO 的兼容责任；
- `audit_logs` 从旧字段迁移到 `occurred_at`/`recorded_at` 的历史数据安全性；
- API v1、已落库 action code 和前端生成类型的发布与回滚边界。

## Decision

### 1. 保持 core 与应用装配层分离

- `core/audit` 只提供 descriptor、registry、middleware、snapshot/sanitize、queue、persistence seam 和 resolver/visibility port，不直接依赖 project、user、role、organization 或 setting 业务表。
- 各 feature 自己定义 `AuditActionDefinition`；路由通过 `audit({ action: descriptor })` 自动注册，认证 hook 等非路由事件显式注册。
- `apps/backend/src/app/audit-policies.ts` 是应用装配入口，负责注册资源名称解析、actor 组织范围和资源可见性策略。
- `features/audit` 只通过 registry、service 和装配的 checker 查询，不反向 deep import 业务 feature 的内部实现。

### 2. 固化事件和查询契约

- `after` 默认不从响应体猜测；路由必须显式选择 `response`、`none` 或 provider，业务 transform 先执行，通用 `sanitize()` 始终执行。
- `occurredAt` 表示事件捕获时间，`recordedAt` 表示异步 INSERT 入库时间，`schemaVersion` 表示事件 payload 解释版本。
- 全局列表保留 `AuditLog` 取证字段；资源时间线使用 `AuditTimelineLog` 最小 DTO，并由服务端返回 `actionLabel`，不因时间线额外依赖 `audit.read` 或 action catalog。
- 已落库的 action code 不重命名、不删除；label 变化通过 descriptor/catalog 兼容映射处理，历史记录至少可以回退显示原始 action code。

### 3. 保持 best-effort 可靠性边界并补齐可观测性

- 默认仍使用进程内有界队列，不把 outbox、外部队列、WORM、SIEM 或强一致审计作为模板默认能力。
- 正常关闭等待 writer 和 in-flight flush，重试、丢弃、队列深度和关闭超时必须通过结构化日志和 queue stats 可见。
- 队列丢弃或进程异常导致的审计缺失属于已知边界；审计日志是内部操作追溯，不是不可丢失的账本。

### 4. migration 发布必须先通过历史数据安全门禁

- 当前分支的 `0008_hesitant_changeling.sql` 直接新增 `occurred_at NOT NULL`,没有显式回填旧 `created_at`;这是发布阻断风险，本 ADR 不把它表述为已解决。
- 该分支未包含部署记录，因此把 0008 视为发布候选迁移；发布前仍必须确认共享/生产环境是否执行过旧版本，并在未执行时先完成安全的 expand/backfill/contract 迁移设计。
- 如果外部环境已执行旧版本 0008，不修改已应用 migration 文件；根据实际 schema 追加 forward migration，并先做备份、行数校验和恢复预案。
- 删除 `created_at`、`actor_role_snapshot` 属于不可自动 down 的 schema/data 变化；代码回滚不等于数据库回滚，恢复依赖备份恢复或经过验证的前向修复。

### 5. API v1 和生成物遵循向后兼容规则

- 尚未发布的当前 contract 可作为 API v1 首个基线；已经有消费者时，不得静默移除旧 DTO 字段，必须保留、版本化或设置明确 deprecation 窗口。
- 阶段 5 已生成的 `apps/frontend/src/api/globals.d.ts` 作为本阶段输入；本阶段不启动后端、不重新执行 `gen:api`，以 contract test 和已提交生成物完成同步校验。

## Relationship with ADR-0009

ADR-0009 仍然是“自建 `core/audit` + `audit()` 声明式接入”的基础架构决策，本 ADR 不替代它，也不设置 `supersededBy`。本 ADR 只补充阶段 1～5 的边界、契约和发布约束；后续若引入 outbox、强一致审计或新的 API major version，应另行新增 ADR。

## Consequences

### Positive

- core、feature、OpenAPI 和前端生成物的职责边界可追溯，action/label 和 timeline DTO 不再依赖多处手写映射。
- 历史审计事件有明确的发生/入库时间和版本语义；但当前 migration 在历史数据场景下仍可能因直接添加非空列失败，发布前必须先完成安全迁移设计。
- 发布评审可以区分 API 兼容、数据库恢复和进程代码回滚，避免把“测试通过”误当作“可安全回滚”。

### Negative

- best-effort 队列仍可能因进程崩溃、满载或数据库不可用丢失事件。
- migration 发布前需要确认外部环境状态；未知部署状态不能通过修改仓库文件自动消除。
- timeline DTO 变窄后，若已有消费者依赖取证字段，必须保留兼容窗口或升级 API 版本。

## Validation

- 后端 unit：`285` 个测试通过。
- 当前 integration test 只验证干净数据库上的最终 schema；历史数据回填路径因 0008 尚未安全化，仍是发布前门禁。
- OpenAPI contract、前后端 typecheck、lint、build 和 integration test 是阶段 6 发布门禁；当前 ADR 状态仍为 `Review`。
