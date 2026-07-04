---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-04
---

# 权限层规范

## 定位

权限层是自建的独立模块（`core/authorization/`），负责授权（Authorization），与认证（Authentication）严格分离：

- **Better Auth 只管认证**：session、user 身份、`/api/auth/*` 原生端点。
- **权限层自建**：组织、角色、权限、授权检查，全部在 Better Auth 之外。

两者唯一联系是 `user.id`：授权表通过 `user_id` 外键引用 Better Auth 的 `user.id`。`requireAuth`（Better Auth）拿到 user 注入 context，`requirePermission`（自建）用 `user.id` 查授权表。换认证方案时权限层不受影响。

> 决策背景见 [ADR-0004](../adr/0004-authorization-layer.md)。

## 权限模型

| 概念 | 说明 |
| --- | --- |
| 用户 | Better Auth `user`，通过 `orgId` 归属一个组织 |
| 组织 | 树形结构（总部→华南→福建/深圳），`parent_id` 自引用 |
| 角色 | 权限的集合（如 `admin`、`viewer`） |
| 权限 | `<resource>.<action>` 字符串（如 `users.read`），由 TypeScript `AppPermission` union 约束 |

## 两条授权路径

所有授权都**绑定组织节点**，都支持**过期时间**（`expires_at`，null 表示永不过期）。

1. **角色路径**：在某组织授用户角色（**可多个**）→ 这些角色权限的并集。例：张三在华南同时授 `admin` 和 `editor`，权限是两角色并集。一个用户在同一组织可有多条 `user_roles` 记录（不同 `role_id`），也可在不同组织各授角色。
2. **直接路径**：在某组织直接授用户一个权限（`allow` 或 `deny`），绕过角色。例：张三在福建直接授 `audit-logs.read`（allow，年底过期）。解决"为单个权限建角色导致角色爆炸"的问题。

## 组织树继承（向下）

在父组织授权 → 所有子组织自动生效。检查时**向上遍历祖先**：目标组织 + 它的所有祖先，任一节点有授权则有效。例：检查福建权限时，祖先集 = {福建, 华南, 总部}，张三在华南的授权对福建生效。

继承**只向下**：在华南授权不影响总部（华南不是总部的祖先）。

## deny

直接授权支持 `effect: allow | deny`。

- **最终权限 = (角色权限 ∪ 直接 allow) − 直接 deny**，再过滤过期。
- **deny 向下传播**：在华南 deny `users.delete` → 福建也拒（福建祖先含华南）。
- **deny 不向上传播**：在福建 deny 不影响华南。
- deny 覆盖 allow（explicit deny 优先），与 AWS IAM 一致。

典型场景：张三是 `admin`（含 users.delete），但临时不该删用户 → 在华南 deny `users.delete`，华南及子组织都不能删。

## 过期

`user_roles` 和 `user_permissions` 都有 `expires_at`（可选，null = 永不过期）。检查时过滤（`expires_at IS NULL OR expires_at > now()`），过期立即失效。后台清理过期记录是可选的 housekeeping，不影响正确性。

## 默认 org scope

`requirePermission` 的 `orgId` 可选：

- 不传 → 默认用 `user.orgId`（用户归属组织）。
- 显式传 → 用传入的组织（如管理某组织时从 path param 取）。

## 检查算法

```txt
checkPermission(userId, permission, orgId):
  1. 递归 CTE 查 orgId 的所有祖先（含自身）
  2. 角色权限 = user_roles（org_id ∈ 祖先集，未过期）JOIN role_permissions
     —— 用户在某组织可有多个角色，全部计入后取并集
  3. 直接 allow = user_permissions（org_id ∈ 祖先集，effect=allow，未过期）
  4. 直接 deny  = user_permissions（org_id ∈ 祖先集，effect=deny，未过期）
  5. 有效权限 = (角色权限 ∪ 直接 allow) − 直接 deny
  6. 返回 permission ∈ 有效权限
```

一条递归 CTE + JOIN 完成。

## 检查 API

```ts
// 业务路由：不传 orgId，默认 user.orgId
middleware: [requireAuth(), requirePermission("users.read")] as const

// 显式 orgId（如管理某组织）
middleware: [requireAuth(), requirePermission("users.read", { orgId: c.req.param("orgId") })]
```

`requirePermission` 是 `core/auth/` 下的中间件，内部调用 `core/authorization/` 的 `PermissionService.check(user.id, permission, orgId)`。未授权抛 `AppError("COMMON_FORBIDDEN")`。

## 数据模型

```txt
organizations(id, name, parent_id, created_at, updated_at)
user.orgId                              # Better Auth additionalFields，归属组织
roles(id, name, description)
permissions(name PK, description)       # users.read 等
role_permissions(role_id, permission)   # 角色含哪些权限
user_roles(user_id, role_id, org_id, expires_at?)
                                        # 同一用户在同一组织可有多行（不同 role_id），支持多角色
user_permissions(user_id, permission, org_id, effect, expires_at?)
```

权限字符串由 TypeScript `AppPermission` union 约束（各 feature 在自己的 `permissions.ts` 声明，通过 module augmentation 汇入），数据库 `permissions` 表用于运行时枚举和管理界面展示。

## 性能

- **请求级 memoize**（必做）：同一请求内多次 `checkPermission` 共享结果，避免重复查询。
- **Redis 缓存**（后续）：预计算用户有效权限集合 + 事件驱动失效。第一版不引入，靠 memoize + 递归 CTE；权限检查成为瓶颈再加。

## 禁止

- 不要把权限层做成 Better Auth 插件（见 [ADR-0004](../adr/0004-authorization-layer.md)）。
- 不要用 Better Auth 的 `hasPermission`（纯角色驱动，无组织树/直接授权/过期/deny）。
- 不要在 `/api/auth/*` 挂权限管理端点（那是认证原生边界，权限管理走 `/api/v1/*` + envelope）。
