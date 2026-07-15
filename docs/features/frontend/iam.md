---
status: Active
owner: frontend
lastReviewedAt: 2026-07-15
---

# 前端 IAM

## 概述

IAM 前端提供角色、组织和用户授权管理界面。组织管理使用 Headless Tree 展示层级，以组织 ID 作为稳定节点 identity，并在同一页面完成节点详情与组织 CRUD。用户管理使用细粒度 `users.*` 权限（对齐后端 #14），与 `iam.*`（组织/角色/授权）分离。

## 范围

- 包含：角色 CRUD 与权限分配、组织树 CRUD、用户授权、用户管理（代创建/编辑/重置密码/禁用·启用）。
- 组织树包含：展开/收起、单选、搜索定位、URL 状态、桌面详情面板和移动端 Sheet。
- 不包含：拖拽移动组织、按任意组织筛选用户、服务端组织搜索和懒加载、硬删除用户（用禁用替代）。

## 路由

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/iam/roles` | `requirePermission("iam.read")` | `listRoles` | `RoleList` |
| `/iam/organizations?org=<id>` | `requirePermission("iam.read")` | `listOrganizations` | `OrganizationExplorer` |
| `/iam/users` | `requirePermission("users.read")` | `listUsers` | `UserList` |

组织路由的 `org` 搜索参数保存当前选中组织。参数缺失或指向不存在的 ID 时，页面回退到第一个根组织并修正 URL。

侧栏「用户」：`permission: "users.read"`（非 `iam.read`）。

## 组件结构

```txt
features/iam/
  organization-tree.ts                  # 树索引、祖先/后代、路径与父节点候选
  components/
    OrganizationExplorer.tsx            # 请求、页面布局、URL 选择和 CRUD orchestration
    organization-tree.tsx               # Headless Tree 渲染、搜索与键盘交互
    organization-details.tsx            # 节点详情和上下文动作
    organization-form.tsx               # 创建、编辑与移动组织
    RoleList.tsx
    UserList.tsx                        # 列表 + 新建/操作菜单 + disabled badge
    user-form.tsx                       # 创建/编辑用户(TanStack Form + zod)
    reset-password-dialog.tsx           # 重置密码弹窗
    role-permissions-dialog.tsx         # 角色权限分配(批量编辑 + diff)
    user-authorization-dialog.tsx       # 用户授权(角色 + 直接 allow/deny + 撤销 + 过期)
```

`@headless-tree/core` / `@headless-tree/react` 只负责树状态、ARIA 和键盘行为；节点视觉继续使用项目的 shadcn/Base UI、Tailwind 语义 token 和 Lucide。

## 用户授权

`UserList` 的「授权」按钮打开 `user-authorization-dialog`，按 Tabs 分两页管理某用户在当前组织的授权，顶部共享「有效权限」(后端 `listUserEffectivePermissions`，含祖先继承 + deny 减法)：

- **角色授权**：列出已授角色(`listUserRoles`，含过期) + 逐条撤销(`deleteUserRole`) + 授角色表单(角色 Select + 过期 DatePicker + `assignUserRole`)。
- **直接授权**：列出已授直接权限(`listUserDirectPermissions`，含 effect/过期) + 逐条撤销(`deleteUserPermission`) + 授直接权限表单(权限 Select + effect allow/deny ToggleGroup + 过期 DatePicker + `assignUserPermission`)。deny = 阻止部分权限。

过期用 DatePicker(react-day-picker v10 + Base UI Popover 薄包装)，日期粒度。授予/撤销后 alova `hitSource` 自动失效对应 GET + `send` 手动刷新(双保险)。**`iam.manage` 才显示授权入口**。

## 用户管理

`UserList` 为完整用户管理（参照 ProjectList 细粒度门控范式）：

| 操作 | 权限 | 交互 |
| --- | --- | --- |
| 进页 / 列表 | `users.read` | 路由守卫 + 侧栏 |
| 新建 | `users.create` | 顶部「新建用户」→ Dialog + `user-form`（name/email/password） |
| 编辑 | `users.update` | 操作菜单「编辑」→ `user-form`（name/email，无密码） |
| 重置密码 | `users.reset-password` | 「重置密码」→ `reset-password-dialog`（newPassword min 8） |
| 禁用 | `users.disable` | AlertDialog 确认；**禁止对自己**（菜单隐藏；后端亦 403） |
| 启用 | `users.enable` | 已禁用行显示「启用」 |
| 授权 | `iam.manage` | 见上节 |

- **disabled badge**：`disabled === true` → destructive「已禁用」，否则 secondary「正常」。
- **currentUserId**：由路由 `auth.user.id` 传入，用于自禁用 UX。
- **缓存**：`IAM.listUsers` hitSource = `[createUser, updateUser, disableUser, enableUser]`（**不含** `resetUserPassword`：重置不改列表字段）；mutation 成功后 `send()` 双保险刷新。

## 组织树数据

- 后端 `listOrganizations` 返回扁平 `Organization[]`，前端以 `id` 建索引并按 `parentId` 构建层级。
- 父组织缺失的节点提升到根层，避免数据静默消失。
- 遍历使用 visited 集合并防御性断开脏数据环；后端 PATCH 防环仍是最终一致性边界。
- 编辑父组织时排除自身及全部后代；Select 显示“总部 / 产品中心”形式的完整路径。
- 同步数据源更新后调用 Headless Tree `scheduleRebuildTree()`，让 alova 刷新结果进入可见树。

## 交互与响应式

- 桌面端：左侧组织树，右侧当前节点详情。
- 小于 `1024px`：只显示组织树，点击或按 Enter/Space 选择节点后用 Sheet 展示详情。
- 页头提供“新建根组织”，详情提供“新建子组织”、编辑和删除。
- 有直接子组织时禁用删除入口；后端 409 继续兜底。
- 搜索遵循 Headless Tree 原生语义：高亮匹配、移动焦点，不从 DOM 中过滤非匹配节点。
- 支持 Up/Down、Left/Right、Home/End、Enter/Space 和输入搜索；焦点状态与选中状态分离显示。

## API 与缓存

- 列表：`useRequest(() => Apis.IAM.listOrganizations())` 等。
- 写操作：直接调用生成的 Method，成功后 `send()` 刷新当前列表状态。
- `api/index.ts` 已通过 mutation `name` + list `hitSource` 自动失效列表缓存。
- 路由 loader 预取列表，组件首次请求命中 alova cache。

## 权限

| 权限 | UX |
| --- | --- |
| `iam.read` | 角色、组织路由与侧栏 |
| `iam.manage` | 角色/组织写操作 + 用户「授权」 |
| `users.read` | 用户路由与侧栏「用户」 |
| `users.create` / `update` / `reset-password` / `disable` / `enable` | 对应用户管理入口 |

前端权限只控制 UX；后端 `PermissionChecker` 才是授权边界。

## 与后端对应

- 后端 feature 文档：[`docs/features/backend/iam.md`](../backend/iam.md)
- 组织 API：`GET/POST /api/v1/organizations`、`PATCH/DELETE /api/v1/organizations/{orgId}`
- 用户管理 API：`POST /api/v1/users`、`PATCH /api/v1/users/{userId}`、`POST /api/v1/users/{userId}/reset-password`、`POST /api/v1/users/{userId}/disable`、`POST /api/v1/users/{userId}/enable`（权限 `users.*`）
- 运行时配置控制决策：[ADR-0007](../../adr/0007-runtime-config-control.md)
