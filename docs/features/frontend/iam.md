---
status: Active
owner: frontend
lastReviewedAt: 2026-07-28
---

# 前端 IAM

## 概述

IAM 前端提供角色、组织和用户授权管理界面。组织管理使用 Headless Tree 展示层级，以组织 ID 作为稳定节点 identity，并在同一页面完成节点详情与组织 CRUD。用户管理使用细粒度 `users.*` 权限（对齐后端 #14），与 `roles.*` / `organizations.*` / `assignments.*`（组织/角色/授权）分离。

## 范围

- 包含：角色 CRUD 与权限分配、组织树 CRUD、用户授权、用户管理（代创建/编辑/重置密码/禁用·启用）。
- 组织树包含：展开/收起、单选、搜索定位、URL 状态、桌面详情面板和移动端 Sheet。
- 不包含：拖拽移动组织、按任意组织筛选用户、服务端组织搜索和懒加载、硬删除用户（用禁用替代）。

## 路由

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/iam/roles?role=<id>&tab=info\|permissions\|users` | `requirePermission("roles.read")` | `listRoles` | `RoleListPanel` + `RoleDetailPanel` |
| `/iam/organizations?org=<id>` | `requirePermission("organizations.read")` | `listOrganizations` | `OrganizationExplorer` |
| `/iam/users?user=<id>&org=<id>&tab=info\|roles\|direct\|effective` | `requirePermission("users.read")` | `listUsers` | `UserListPanel` + `UserDetailPanel` |

组织路由的 `org` 搜索参数保存当前选中组织。参数缺失或指向不存在的 ID 时，页面回退到第一个根组织并修正 URL。用户/角色路由的 `user`/`role` 保存当前选中项（缺失时回退首条），`tab` 保存详情面板当前 Tab（缺失默认 `info`），`org`（仅用户）保存授权视角组织（默认被选用户的 home org）——支持深链接与刷新保位。

侧栏「用户」：`permission: "users.read"`（非 `roles.read` / `organizations.read`）。

## 组件结构

```txt
features/iam/
  components/                           # 组件
    organization-explorer/              # 请求、页面布局、URL 选择和 CRUD orchestration(目录)
      index.tsx                         # 容器:data + 选中派生(fallback 不写 URL)+ 装配
      organization-explorer-content.tsx # 双栏 + Sheet(抽 OrganizationDetails 重复)
      organization-dialogs.tsx          # 创建/编辑 Dialog + 删除确认
      organization-explorer-skeleton.tsx
    organization-tree.tsx               # Headless Tree 渲染、搜索与键盘交互
    organization-details.tsx            # 节点详情和上下文动作
    organization-form.tsx               # 创建、编辑与移动组织
    role-list.tsx                       # 左列表 + 搜索 + 选中回调 + 新建按钮
    user-list.tsx                       # 左列表 + 搜索 + 选中回调 + disabled badge + 新建按钮
    role-detail-panel/                  # 角色详情(目录):信息 / 权限分配(diff + 批量) / 已授用户
      index.tsx                         # 容器:头部 + Tabs + 编辑/删除对话框
      role-info-tab.tsx
      role-permissions-tab/             # 权限分配(抽 useRolePermissions hook)
        index.tsx
        use-role-permissions.ts
      role-users-tab.tsx
    user-detail-panel/                  # 用户详情(目录):组织选择器 + 信息 / 角色授权 / 直接授权 / 有效权限
      index.tsx                         # 容器:组织选择器 + Tabs + 编辑/重置/禁用对话框
      user-info-tab.tsx
      effective-permissions-panel.tsx   # 含 SourceBadge
      role-assignments-tab.tsx
      role-assignment-row.tsx
      direct-permissions-tab.tsx
      direct-permission-row.tsx
    user-form.tsx                       # 创建/编辑用户(TanStack Form + zod)
    reset-password-dialog.tsx           # 重置密码弹窗
  hooks/                                # 业务 hook
    use-user-page-state.ts              # orgOptions/getOrgPath 派生(从 route 下放)
  lib/                                  # feature 内工具
    organization-tree.ts                # 树索引、祖先/后代、路径与父节点候选
    iam-actions.ts                      # action delegation(cache 刷新)
    permission-format.ts                # 权限名格式化
    group-by-resource.ts               # 权限按 resource 分组
  organizations-page.tsx               # page 组装(薄 wrapper,route 传 props)
```

`@headless-tree/core` / `@headless-tree/react` 只负责树状态、ARIA 和键盘行为；节点视觉继续使用项目的 shadcn/Base UI、Tailwind 语义 token 和 Lucide。

## 用户授权

`UserDetailPanel` 顶部「授权视角组织」选择器（操作者管理子树内 org，带路径）+ 四 Tab 管理某用户在选中组织的授权。`org`/`tab` 进 URL，支持深链接。切换视角组织或调岗后，三个授权 Tab（角色/直接/有效权限）用 `useWatcher` 监听 `orgId` 自动重拉数据。调岗成功后 URL `org` 参数同步设为新 org，防止视角卡在旧 org。

- **有效权限**：后端 `IAM.listUserPermissions` 直接返回带来源链的结构（`effective` + `denied`），无需前端 N+1 拼。每条权限展示来源 badge（角色名可点击跳转角色详情，组织可点击切到该 org 视角），祖先继承的权限来源 orgId 即祖先组织。被 deny 抵消的权限单独成区，标注本会来自的来源（`suppressedSources`）与哪些 org deny（`deniedBy`）。
- **角色授权**：列出已授角色（`listUserRoles`，含过期，角色名可点击跳转） + 逐条撤销（`deleteUserRole`） + 授角色表单（角色 Select + 过期 DatePicker + `assignUserRole`）。选中角色后内联预览其权限，并对比当前有效权限高亮「授予后将新增」的权限，消除盲选。
- **直接授权**：列出已授直接权限（`listUserDirectPermissions`，含 effect/过期） + 逐条撤销（`deleteUserPermission`） + 授直接权限表单（权限 Select + effect allow/deny ToggleGroup + 过期 DatePicker + `assignUserPermission`）。deny = 阻止部分权限。

**组织选择器**解决「祖先 org 授的授权在 home org 视角不可见不可撤销」：`listUserRoles`/`listUserDirectPermissions` 用 `eq(orgId)` 只返回该 org 直接授权，有效权限走祖先继承 CTE；切换组织选择器可逐个 org 查看直接授权与生效全集，来源 badge 的组织点击可快速跳到祖先 org 视角。

过期用 DatePicker（react-day-picker v10 + Base UI Popover 薄包装），日期粒度。授予/撤销后 alova `hitSource` 自动失效对应 GET。**需 `assignments.read` + `roles.read` + `permissions.read` 且至少持 `assignments.grant` 或 `assignments.revoke` 才显示授权入口**，且对自己的行隐藏；「授予」按钮受 `assignments.grant` 控制、「撤销」按钮受 `assignments.revoke` 控制（无权限则隐藏）；后端 `deleteUserRole`/`deleteUserPermission` 禁止对自己操作，防自我降级锁死。

> 续期语义：重复授角色/权限时，提供 `expiresAt` 则更新（续期），省略则保留原过期时间（不清空）；UI 标注「暂不支持从有限期改回永不过期」（后端 `onConflictDoUpdate` 不支持显式清空，留后续）。

## 用户管理

`UserList` 为完整用户管理（参照 ProjectList 细粒度门控范式）：

| 操作 | 权限 | 交互 |
| --- | --- | --- |
| 进页 / 列表 | `users.read` | 路由守卫 + 侧栏 |
| 新建 | `users.create` | 顶部「新建用户」→ Dialog + `user-form`（name/email/password） |
| 编辑 | `users.update` | UserDetailPanel 信息 Tab「编辑」→ `user-form`（name/email，无密码） |
| 调岗 | `users.update` | 信息 Tab「调岗」-> Dialog 选目标组织 + `transferUserOrganization`（非自己;旧独有 grant 自动清理,共同祖先保留） |
| 重置密码 | `users.reset-password` | 信息 Tab「重置密码」→ `reset-password-dialog`（newPassword min 8） |
| 禁用 | `users.disable` | 信息 Tab AlertDialog 确认；**禁止对自己**（按钮隐藏；后端亦 403） |
| 启用 | `users.enable` | 信息 Tab（已禁用用户显示「启用」） |
| 授权 | `assignments.read` + `roles.read` + `permissions.read` + (`assignments.grant` 或 `assignments.revoke`) | 见上节 |

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
| `roles.read` / `organizations.read` | 角色、组织路由与侧栏 |
| `organizations.create/update/delete` / `roles.create/update/delete/assign-permissions/revoke-permissions` / `assignments.grant/revoke` | 组织/角色/授权写操作 |
| `users.read` | 用户路由与侧栏「用户」 |
| `users.create` / `update` / `reset-password` / `disable` / `enable` | 对应用户管理入口 |

门控 API:声明式门控用 `<Can>`(`@/components/shared/can`),`permission`/`anyOf`/`allOf` 三选一互斥(单/或/与),支持 render-prop `{({ allowed }) => ...}`(disable 模式)+ `fallback`;命令式或混合 AND+OR 组合用 hook(`@/hooks/use-permissions`):`useCan`、`useCanAny`(OR)、`useCanAll`(AND)。行操作菜单用 `<ResourceActions items=[{allowed,label,icon,onClick}]>`(`@/components/shared/resource-actions`,数据驱动消除 `{canX && <DropdownMenuItem>}` 堆叠,`allowed` 由 `useCan` 算好传入)。

前端权限只控制 UX；后端 `PermissionChecker` 才是授权边界。

## 与后端对应

- 后端 feature 文档：[`docs/features/backend/iam.md`](../backend/iam.md)
- 组织 API：`GET/POST /api/v1/organizations`、`PATCH/DELETE /api/v1/organizations/{orgId}`
- 用户管理 API：`POST /api/v1/users`、`PATCH /api/v1/users/{userId}`、`POST /api/v1/users/{userId}/reset-password`、`POST /api/v1/users/{userId}/disable`、`POST /api/v1/users/{userId}/enable`（权限 `users.*`）
- 运行时配置控制决策：[ADR-0007](../../adr/0007-runtime-config-control.md)
