---
status: Active
owner: backend-platform
lastReviewedAt: 2026-08-07
---

# 权限层规范

## 定位

权限层是自建的独立模块（`core/authorization/`），负责授权（Authorization），与认证（Authentication）严格分离：

- **Better Auth 只管认证**：session、user 身份、`/api/auth/*` 原生端点。
- **权限层自建**：组织、角色、权限、授权检查，全部在 Better Auth 之外。

两者唯一联系是 `user.id`：授权表通过 `user_id` 外键引用 Better Auth 的 `user.id`。`requireAuth`（Better Auth）拿到 user 注入 context，`requirePermission`（自建）用 `user.id` 查授权表。换认证方案时权限层不受影响。

> 决策背景见 [ADR-0004](../../adr/0004-authorization-layer.md)。

## 边界划分（Port/Adapter）

权限层按 PEP/PDP 分离，core 只保留 PEP + 抽象 + 无策略基础设施，策略算法与数据查询归 `features/iam`：

| 职责 | 位置 | 说明 |
| --- | --- | --- |
| PEP（执行） | `core/auth/require-permission.ts` | 中间件，调 `PermissionService.check` |
| Port（接口） | `core/authorization/permission-checker.ts` | `PermissionChecker` 接口 + holder + `setPermissionChecker` |
| memoize 装饰 | `core/authorization/permission-service.ts` | 读 ALS 缓存，miss 调 holder |
| ALS 缓存机制 | `core/authorization/permission-cache.ts` | 请求级缓存，纯横切基础设施 |
| 启动同步 | `core/authorization/sync.ts` | 接收组装点传入的权限定义数组，upsert 到 db 镜像，无策略 |
| PDP Adapter | `features/iam/permission-checker.ts` | `IamPermissionChecker`，递归 CTE 算法 + db 查询 |
| PAP（管理） | `features/iam/service.ts` | 角色/授权/组织管理 API |

core 不 import features：holder 持 `PermissionChecker` 接口引用，由 `app.ts` 启动时 `setPermissionChecker(new IamPermissionChecker())` 装配。这层隔离让 PDP 可替换——将来换 Cerbos/SpiceDB 等外部引擎，只换 Adapter，core 与 PEP 不动。

## 权限模型

| 概念 | 说明 |
| --- | --- |
| 用户 | Better Auth `user`，通过 `orgId` 归属一个组织 |
| 组织 | 树形结构（总部→华南→福建/深圳），`parent_id` 自引用 |
| 角色 | 权限的集合（如 `admin`、`viewer`） |
| 权限 | `PermissionCode` 机器身份（如 `users.read`）；展示元数据通过 `PermissionRef` 提供 |

## 权限身份与展示契约

权限身份与展示元数据分离：

- `PermissionCode` 是唯一机器身份，授权检查、缓存 key、数据库外键和 OpenAPI 输入都只使用 code。
- 每个 feature 在自己的 `permissions.ts` 中调用 `definePermissionCatalog()`，一次声明 resource/action 的 code 与展示 label；builder 自动生成 `code`、`resourceCode` 和 `actionCode`。
- `PermissionDefinition` / `PermissionRef` 包含 `code`、`resourceCode`、`actionCode`、`resourceLabel`、`label`。label 只用于 HTTP presenter 和前端展示，不进入授权核心或数据库。
- declaration merging 以 feature 的完整权限数组作为一个 registry slot；`permissions-catalog.ts` 负责汇总、唯一性校验和覆盖校验。core 不维护具体业务资源、中文 label、`PermissionName` 或 `getResourceLabel`。
- `/api/v1/me` 返回 `permissionCodes`；需要展示权限的响应返回 `permission: PermissionRef`。字符串身份统一命名为 `permissionCode`，字符串数组统一命名为 `permissionCodes`。

因此，新增权限只需在 feature catalog 声明并在应用 catalog 汇总；授权代码不再重复维护文本映射。

## 权限命名规则

权限名格式为 `\<resource\>.\<action\>`，但 `resource` 与 `action` 都有约束：

- **resource 必须是业务实体名**，不能是模块/feature 名。当前实体：`permissions`、`roles`、`organizations`、`assignments`、`users`、`projects`、`settings`。
- **action 必须是细粒度 verb**，不能是聚合词 `manage`。当前动词：`read`、`create`、`update`、`delete`、`grant`、`revoke`、`assign-permissions`、`revoke-permissions`、`reset-password`、`disable`、`enable`。
- **聚合靠 Role，不靠 permission name**。不要把多个写操作塞进一个 `*.manage` 权限名；需要用角色批量授权。
- resource/action 的格式由 catalog builder 校验：必须使用小写字母开头、仅含小写字母/数字/连字符；builder 同时校验 label 非空并自动生成 code。

## 两条授权路径

所有授权都**绑定组织节点**，都支持**过期时间**（`expires_at`，null 表示永不过期）。

1. **角色路径**：在某组织授用户角色（**可多个**）→ 这些角色权限的并集。例：张三在华南同时授 `admin` 和 `editor`，权限是两角色并集。一个用户在同一组织可有多条 `user_roles` 记录（不同 `role_id`），也可在不同组织各授角色。
2. **直接路径**：在某组织直接授用户一个权限（`allow` 或 `deny`），绕过角色。例：张三在福建直接授 `projects.read`（allow，年底过期）。解决"为单个权限建角色导致角色爆炸"的问题。

## 组织三轴

授权与管理沿三条独立的「组织轴」,用词写死,避免与「切换组织」等混淆:

| 轴 | 含义 | 方向 | 模板目标 |
| --- | --- | --- | --- |
| **Home org**(归属组织) | 用户人事归属,`user.orgId` 单值;登录后默认以此 org 检查权限 | - | 单组织模型,不提供登录后切换当前组织(Non-goal) |
| **管理子树**(管理范围) | 管理员可写操作(建/改/删用户、授/撤 grant)的范围 = 操作者 Home org 的**自身 + 所有子孙** | 向下 | 成员 CRUD 与授权写路径共用同一套子树定义 |
| **Grant org**(授权组织) | 角色/直接权限绑定的组织节点;检查时**向上遍历祖先**,任一节点有授权则有效 | 向上(继承向下传播) | 已实现(见下文「组织树继承」) |

**管理子树(向下)与 Grant 继承(向上)方向相反,不可混用**:管理子树决定「我能管谁」--写操作范围向子孙展开;Grant 继承决定「授在父组织、子组织生效」--检查范围向祖先回溯。例:张三 Home = 华南,管理子树 = {华南, 福建, 深圳}(可在此范围建用户/授 grant);张三在总部授 admin,因福建祖先含总部,张三在福建检查 admin 通过(Grant 继承)。

> 当前实现:Grant org 继承已落地;**管理子树已实现**(createUser 选目标 org + listUsers/update/reset/disable/enable 子树校验 + 调岗 transferUserOrganization);授权写路径(assign/revoke)子树校验已实现(与读端点对称)。调岗改 user.orgId 到管理子树内新 org,同事务清理失效 grant(旧 home 独有路径上的 user_roles/user_permissions,共同祖先保留),禁止自调岗,乐观锁防并发。

## 组织树继承（向下）

在父组织授权 → 所有子组织自动生效。检查时**向上遍历祖先**：目标组织 + 它的所有祖先，任一节点有授权则有效。例：检查福建权限时，祖先集 = {福建, 华南, 总部}，张三在华南的授权对福建生效。

继承**只向下**：在华南授权不影响总部（华南不是总部的祖先）。

## deny

直接授权支持 `effect: allow | deny`。

- **最终权限 = (角色权限 ∪ 直接 allow) − 直接 deny**，再过滤过期。
- **deny 向下传播**：在华南 deny `users.disable` → 福建也拒（福建祖先含华南）。
- **deny 不向上传播**：在福建 deny 不影响华南。
- deny 覆盖 allow（explicit deny 优先），与 AWS IAM 一致。

典型场景：张三是 `admin`（含 users.disable），但临时不该禁用用户 → 在华南 deny `users.disable`，华南及子组织都不能禁用。

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

`requirePermission` 是 `core/auth/` 下的中间件，内部调用 `core/authorization/` 的 `PermissionService.check(user.id, permissionCode, orgId)`。未授权抛 `AppError("COMMON_FORBIDDEN")`。

## 数据模型

```txt
organizations(id, name, parent_id, created_at, updated_at)
user.orgId                              # Better Auth additionalFields，归属组织
roles(id, name, description)
permissions(code PK)                    # users.read 等，只保存外键锚点
role_permissions(role_id, permission_code) # 角色含哪些权限
user_roles(user_id, role_id, org_id, expires_at?)
                                        # 同一用户在同一组织可有多行（不同 role_id），支持多角色
user_permissions(user_id, permission_code, org_id, effect, expires_at?)
```

权限 code 由 `AppPermissionCode` union 约束（各 feature 的 catalog 通过 `declare module` 以完整数组 slot 注册到 core 的 `AppPermissionRegistry`；core 不 import features，类型由 feature 反向扩展）。数据库 `permissions` 表只保存 code 外键锚点，由组装点汇总 catalog 后启动同步写入（见下文）。

## 数据生命周期

权限层数据分三类，真相来源不同，生产里的来法也不同：

| 数据 | 表 | 真相来源 | 生产怎么来 |
| --- | --- | --- | --- |
| ① 权限 registry | `permissions` | 代码 catalog（各 feature `definePermissionCatalog()` + `declare module` 注册；`permissions-catalog.ts` 汇总） | `index.ts` 启动时把 `allPermissions` 传 `syncAuthorizationCatalog` 同步 code |
| ② 角色定义 | `roles` + `role_permissions` | 代码（`admin` 角色，`source='code'`）+ 管理 API（其他角色，`source='instance'`） | `admin` 启动同步；其他角色管理 API 建 |
| ③ 实例数据 | `organizations` / `users` / `user_roles` / `user_permissions` | 每个 deployment 自己 | 管理 API + 一次性 bootstrap（`pnpm db:bootstrap`） |

### 代码同步（①②）

`core/authorization/sync.ts` 的 `syncAuthorizationCatalog(defs)`：把组装点传入的权限 code upsert 进 code-only `permissions` 表，并 upsert 标准 `admin` 角色（`role_permissions` 给 admin 授全部权限）。单事务原子完成，幂等 upsert，代码 catalog 是真相来源，DB 只是外键镜像。

- **app 启动时自动跑**（`index.ts` 在 `serve` 前），dev/prod 都同步，生产免人肉。sync 假设 schema 已就位，部署需先 `db:migrate` 再 start。
- `seed.ts`（dev/demo）也复用它，保证本地目录就位。
- catalog 外的 DB code 若仍被 `role_permissions` 或 `user_permissions` 引用，启动同步失败；若没有任何授权引用则允许清理 registry 行。同步不会自动删除角色授权或用户直接授权，避免静默丢授权。
- code-only schema 不保存 label、description、创建/更新时间等展示或生命周期字段；权限生命周期不由数据库管理。

各 feature 在 `permissions.ts` 调用 `definePermissionCatalog()` 声明完整权限数组，并用 module augmentation 注册一个数组 slot；`permissions-catalog.ts` 汇总为 `allPermissions`，同时执行运行时唯一性/格式校验和编译期 registry 覆盖校验。新增 feature 时在 catalog 追加 import + 展开到数组——漏登记会导致 `requirePermission("x")` 编译报错。

### 实例数据（③）

组织、用户、授权是 deployment 特定的，走自建管理 API（`/api/v1/*` + envelope，见 [ADR-0004](../../adr/0004-authorization-layer.md) 代价）。空生产从 0 开始：先 `pnpm db:bootstrap` 造根组织 + 第一个 admin 用户（授标准 admin 角色），再由 admin 通过管理 API 建组织、建角色、授角色/直接授权。

管理 API 端点（`features/iam` + `features/me`，权限需求见各端点；`/api/v1/me` 仅需认证）：

- `GET /api/v1/me`：当前用户信息 + 有效权限全集
- `GET /api/v1/permissions`：权限目录（代码同步，只读）
- 角色：`GET/POST /api/v1/roles`、`PATCH/DELETE /api/v1/roles/{id}`、`GET/POST /api/v1/roles/{id}/permissions`、`DELETE /api/v1/roles/{id}/permissions/{permissionCode}`（仅 `source='instance'` 角色可改删；body 使用 `{ permissionCodes }`）
- 用户授权：`POST/DELETE /api/v1/users/{userId}/roles/{roleId}`、`POST/DELETE /api/v1/users/{userId}/permissions/{permissionCode}`、`GET /api/v1/users/{userId}/permissions`（有效全集，祖先继承）、`GET /api/v1/users/{userId}/roles`（已授角色记录，直接授权）、`GET /api/v1/users/{userId}/direct-permissions`（已授直接权限记录，allow/deny）
- 组织：`GET/POST /api/v1/organizations`、`GET/PATCH/DELETE /api/v1/organizations/{orgId}`（改 parentId 防环，有子组织或有用户拒绝删除）

## 性能

- **请求级 memoize**（必做）：同一请求内多次 `checkPermission` 共享结果，避免重复查询。
- **Redis 缓存**（后续）：预计算用户有效权限集合 + 事件驱动失效。第一版不引入，靠 memoize + 递归 CTE；权限检查成为瓶颈再加。

## 禁止

- 不要把权限层做成 Better Auth 插件（见 [ADR-0004](../../adr/0004-authorization-layer.md)）。
- 不要用 Better Auth 的 `hasPermission`（纯角色驱动，无组织树/直接授权/过期/deny）。
- 不要在 `/api/auth/*` 挂权限管理端点（那是认证原生边界，权限管理走 `/api/v1/*` + envelope）。
- 不要在前端或数据库维护权限中文映射；展示权限必须消费后端 `PermissionRef`。

## 模板完成度

模板 day-0 默认（成员子树、去注册、拆分写权限三分、调岗等）的勾选清单见 [IAM 完成度 Checklist](../../checklists/iam-completeness-checklist.md)。本规范描述算法与边界；清单跟踪与「目标态」的差距。
