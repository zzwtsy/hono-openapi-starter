---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-08-13
---

# ADR-0013：唯一系统根与分级管理员目标授权

## Context

阶段一已保证每个用户都有受外键保护的 Home org，但 IAM 写操作仍主要在操作者 Home org 做一次权限检查。权限只授在子组织时无法操作该节点；相反，在 Home 有权限也可能绕过目标节点的 deny。组织列表全局可见、业务 API 可创建多个根，子树检查与组织移动之间也存在并发窗口。

## Decision

1. `organizations_single_root_idx` 以部分唯一表达式索引保证最多一个 `parent_id IS NULL`。bootstrap/seed 创建唯一系统根，业务 API 的 `parentId` 必填，不提供创建或替换根的入口。
2. 系统根可以改名，但不能删除、移动或通过 API 创建第二个根。组织树读路径只返回操作者 Home org 的自身与子孙；树外组织/用户统一按 404 处理。
3. 列表入口权限仍相对 Home org 检查；所有组织、用户和授权写操作在 service 内针对实际目标组织执行 PEP。调岗同时校验旧 Home 与新 Home，grant 写同时校验目标用户 Home 与 Grant org。
4. 组织 create/move/delete 获取事务级独占 PostgreSQL advisory lock；所有依赖管理子树的用户和授权写获取共享 lock，并在事务内重新校验范围与权限。
5. 角色定义保持 deployment 级全局，不新增 `roles.orgId`。只有 Home org 为系统根且具备对应 `roles.*` 权限的用户可修改全局角色；普通组织仍可读取和分配角色。
6. 下级管理员授角色时必须在 Grant org 拥有角色当前全部权限；直接 allow/deny 必须拥有对应权限；永久授权要求永久来源，临时授权不能超过操作者当前来源的有效期。Grant org 必须是目标用户 Home org 或其祖先。管理 API 禁止自授权和自撤权。
7. 系统根对全局角色的后续权限修改属于受信任的全局策略变更，会传播到已有角色授权。若业务需要固定权限快照或各组织独立角色，应新增组织级角色模型，而不是在本模型中隐式复制权限。
8. `GET /api/v1/me/capabilities?orgId=...` 返回当前用户在管理子树内目标组织的有效权限，供前端 UX 门控；后端写操作始终重新鉴权。

## Consequences

- 数据库与 API 共同维持唯一根，Greenfield provisioning 可得到确定组织拓扑。
- 目标节点 allow/deny 和子节点授权能被正确执行，不再被 Home-org middleware 扭曲。
- advisory lock 将组织移动与子树依赖写串成稳定锁协议，代价是组织拓扑写全局串行；该频率对模板 IAM 可接受。
- 全局角色简单且易治理，但系统根是明确的策略信任边界，角色扩权会传播。
- capability 请求增加少量读流量；它只影响展示，不承担安全职责。

## Non-goals

- 组织级角色、`roles.orgId`、多组织 membership 或登录后切换组织。
- 历史多根合并、旧库回填、旧 API 兼容和双写。
- 审批流、双人复核、完整 SoD、Redis/外部 PDP、邀请邮件或硬删除用户。

## Related

- [ADR-0004：权限层自建，不扩展 Better Auth](0004-authorization-layer.md)
- [ADR-0012：Home org 完整性与认证 schema 所有权](0012-home-org-integrity-and-auth-schema-ownership.md)
- [权限层规范](../conventions/backend/authorization.md)
- [IAM feature](../features/backend/iam.md)
