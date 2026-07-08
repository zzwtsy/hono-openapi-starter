---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-07-04
---

# ADR-0004: 权限层自建，不扩展 Better Auth

## Status

Accepted

## Context

模板需要一套权限系统，需求超出基础 RBAC：

- **组织树**：层级组织（总部→华南→福建/深圳），权限带组织 scope，向下继承。
- **用户直接授权**：绕过角色直接给用户授单个权限，避免为单个权限建角色导致角色爆炸。
- **授权过期**：角色授予和直接授权都支持 `expires_at`。
- **deny**：显式拒绝，覆盖 allow。

Better Auth 内置能力经源码确认（v1.6.23）：

| 需求 | Better Auth 覆盖 | 说明 |
| --- | --- | --- |
| 组织树继承 | 0% | `organization` 表无 `parentId`，不支持层级 |
| 用户直接授权 | 0% | `hasPermissionFn` 纯角色驱动，无 `user_permission` 路径 |
| 授权过期 | 0% | 角色/成员授予无 `expires_at`（只有 invitation/ban 有过期） |
| deny | 0% | access 模块纯 allow statement 匹配 |

且 `hasPermissionFn` 无 policy 钩子，无法接入自定义检查逻辑。

## Decision

权限层**自建为独立模块**（`core/authorization/`），不做 Better Auth 插件。Better Auth 只保留基础认证（`emailAndPassword` + session + `user/account/session/verification` 4 表）。

- 不用 Better Auth 的 `organization` / `admin` 插件（组织扁平、角色是字符串、无过期，与需求重叠且不够用）。
- 不用 Better Auth 的 `hasPermission`，自建 `PermissionService.check`。
- 权限层与 Better Auth 唯一联系是 `user.id`（授权表外键）。

## Consequences

优点：

- **自由**：组织树继承、直接授权、过期、deny 都能按需求实现，不受 Better Auth API 限制。
- **解耦**：权限层与认证解耦，换认证方案（Lucia/Auth.js/Clerk）时权限层不改。
- **升级安全**：不依赖 Better Auth 内部 API（`hasPermissionFn`），Better Auth 升级不影响权限层。

代价：

- **自建成本**：权限表、检查算法（递归 CTE）、管理 API、缓存失效都要自己实现和维护。
- **性能责任**：权限检查每请求都跑，需 memoize / 缓存优化（第一版 memoize，后续 Redis）。
- **管理 API**：授角色/授权限的 CRUD 端点已自建（`features/iam`，走 `/api/v1/*` + envelope）。`roles` 加 `source` 列区分代码同步角色（`code`，admin）与管理 API 创建角色（`instance`）；管理 API 改/删仅限 `instance`，代码角色只读。第一个 admin 由 `pnpm db:bootstrap` 引导。
- **Port/Adapter 边界**：权限检查（PDP）通过 `PermissionChecker` 接口（`core/authorization/permission-checker.ts`）抽象，实现（`IamPermissionChecker`，递归 CTE）在 `features/iam`，启动时 `setPermissionChecker` 装配。core 不 import features，PDP 可替换（将来换外部引擎只换 Adapter，core 与 PEP 不动）。
- **core 零 import features**：权限目录用 declaration merging（各 feature `permissions.ts` 用 `declare module` 把权限名 push 到 core 的 `AppPermissionRegistry`，`AppPermission` 从 registry 推导；组装点 `index.ts` 汇总各 feature 权限传 `syncAuthorizationCatalog`，`AllPermissionsCovered` 编译期校验覆盖，漏汇总编译报）。路由由组装点 `app.ts` 挂载（`core/app` 只挂认证路由）。core 不再 import features，[directory-structure.md](../architecture/directory-structure.md) 的"core 不能 import features"完全成立。

## 关联

- [权限层规范](../conventions/authorization.md)
- [Better Auth 集成](../conventions/auth-better-auth.md)
- [ADR-0003: Better Auth 原生端点不套 envelope](0003-keep-better-auth-native.md)
