---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-08-17
date: 2026-08-01
---

# ADR-0009:审计日志(自建 core/audit + 中间件声明式接入)

## Context

全项目写操作无留痕:谁在何时对什么资源做了什么、改前改后、成功失败,没有追溯能力。引入审计功能有两条候选路径:

1. **Better Auth 审计插件**(`better-auth-audit-logs`):表结构不兼容——只有 session/user 事件,缺 `resourceRefs`/`before`/`after` 等业务字段;只覆盖认证事件,业务写操作(项目/角色/授权)无法接入。
2. **自建 `core/audit/` 基础设施**:写操作统一经路由中间件声明式接入,业务 service/handler 零改动。

## Decision

**自建 `core/audit/`,不引入 Better Auth 审计插件**。核心决策:

1. **fire-and-forget 异步写入**:有界队列 + 后台批量 flush(INSERT batch),不阻塞业务响应。队列满时丢弃 + warn 日志。
2. **只记写操作 + 认证事件,不记读**:读操作占 80-95%,无审计价值且成本高。
3. **`audit()` 路由中间件声明式接入**:挂在路由 `middleware` 数组,配置(动作/资源/before/after/metadata)即 action 目录,service/handler 零改动。
4. **历史快照**:`resource_refs` JSONB(支持多资源,`@>` + GIN 索引查询),写入时解析名称快照(`relationResolvers` 注册表);`before_state`/`after_state` 存脱敏快照(复用 logger/redact 敏感字段名单),关联 id 显式声明 `relations` 后解析为 `_names`。
5. **失败也记**:`status=failure` + `errorCode`,失败的写操作有审计价值(如登录失败)。
6. **可见性**:全局列表按 `actorOrgId` 管理子树过滤(与 IAM 语义一致);by-resource 时间线按资源类型分派校验(project/user 走归属/子树,role/org/setting 走对应 `*.read` 权限),有业务读权限即可看时间线,不需 `audit.read`。
7. **保留策略**:env `AUDIT_LOG_RETENTION_DAYS`(默认 90,0=永久),查询时惰性过滤 + 定时物理删除双机制。
8. **append-only 应用层自律**:`writeAudit` 只 INSERT,不暴露 update/delete(单 DB 用户无法 REVOKE 自己的权限,不做 DB 层强制)。

**明确不做**:哈希防篡改链(内部模板非强合规)、时间分区、读操作审计、SIEM/外部日志对接、审计导出端点。

## Consequences

- **性能**:写入不阻塞业务;队列满时审计记录丢失(有 warn 日志可观测),业务不受影响。
- **一致性**:审计与业务写操作非原子,极端场景(进程崩溃)审计可能丢;审计是"尽力而为"的追溯,不是账本。
- **已知边界**:权限校验(401/403)发生在 `audit()` 之前,授权失败不产生审计记录;`actorOrgId IS NULL` 的事件(登录失败)在全局列表对任何管理员可见。
- **契约**:action 命名 `<resource>.<verb>`,label 声明在 audit 配置里(配置即 catalog,后端单一来源,前端不维护映射)。
- 使用方式见 [backend/audit feature 文档](../features/backend/audit.md)。
