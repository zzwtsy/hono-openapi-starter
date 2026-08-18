---
status: Active
owner: frontend
lastReviewedAt: 2026-08-18
---

# 前端 IAM

## 概述

IAM 前端提供角色、组织和用户授权管理界面。三个页面统一使用 `IamWorkbench` 主从工作台：宽屏双栏，窄屏列表 + Sheet，并且每次只挂载一份实体详情。组织管理使用 Headless Tree 展示层级，以组织 ID 作为稳定节点 identity，并在同一页面完成节点详情与组织 CRUD。用户管理使用细粒度 `users.*` 权限（对齐后端 #14），与 `roles.*` / `organizations.*` / `assignments.*`（组织/角色/授权）分离。

分级管理员 UI 以管理子树和目标 capability 为准：组织树只展示 Home org 自身与子孙；系统根不提供删除/移动或新建根入口；用户与授权操作按目标 Home/Grant org capability 显隐；全局角色写入口仅系统根用户可见。所有前端门控只用于 UX，后端目标 PEP 才是安全边界。

## 范围

- 包含：角色 CRUD 与权限分配、组织树 CRUD、用户授权、用户管理（代创建/编辑/重置密码/禁用·启用）。账户页的自助授权来源查看与此 IAM API 共用契约，但不受管理端权限门控。
- 组织树包含：展开/收起、单选、搜索定位、URL 状态、桌面详情面板和移动端 Sheet。
- 不包含：拖拽移动组织、按任意组织筛选用户、服务端组织搜索和懒加载、硬删除用户（用禁用替代）。

## 路由

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/iam/roles?role=<id>&tab=info\|permissions\|users` | `requirePermission("roles.read")` | `listRoles` | `RoleListPanel` + `RoleDetailPanel` |
| `/iam/organizations?org=<id>` | `requirePermission("organizations.read")` | `listOrganizations` | `OrganizationExplorer` |
| `/iam/users?user=<id>&org=<id>&tab=overview\|access\|audit&accessView=config\|effective` | `requirePermission("users.read")` | `listUsers` | `UserListPanel` + `UserDetailPanel` |

组织路由的 `org` 搜索参数保存当前选中组织。参数缺失或指向不存在的 ID 时，页面回退到第一个根组织并修正 URL。用户/角色路由的 `user`/`role` 保存当前选中项（缺失时回退首条），`tab` 保存详情面板当前 Tab；用户默认 `overview`，角色默认 `info`。用户访问权限内部视图由 `accessView` 控制，默认 `config`；旧 `roles`/`direct` 映射到配置视图，旧 `effective` 映射到生效结果，`info` 映射到概览。切换组织或主 Tab 保留 `accessView`，切换用户会回到概览并在下次进入访问权限时使用默认配置视图。`org` 保存授权视角组织（默认被选用户的 home org），支持深链接与刷新保位。

侧栏「用户」：`permission: "users.read"`（非 `roles.read` / `organizations.read`）。

## 组件结构

```txt
features/iam/
  users-page.tsx                        # 用户页请求、选择、工作台与创建 Dialog 编排
  roles-page.tsx                        # 角色页请求、选择、工作台与创建 Dialog 编排
  organizations-page.tsx                # 组织页薄 feature wrapper
  components/                           # 组件
    iam-workbench.tsx                   # PageHeader、1280px 主从布局、单实例详情和 Sheet
    iam-detail-surface.tsx              # desktop Card / Sheet 无 Card 的详情表面
    organization-explorer/              # 请求、页面布局、URL 选择和 CRUD orchestration(目录)
      index.tsx                         # 容器:data + 选中派生(fallback 不写 URL)+ 装配
      organization-explorer-content.tsx # 组织树导航 Card
      organization-dialogs.tsx          # 创建/编辑 Dialog + 删除确认
      organization-explorer-skeleton.tsx
    organization-tree.tsx               # Headless Tree 渲染、搜索与键盘交互
    organization-details.tsx            # 节点详情和上下文动作
    organization-form.tsx               # 创建、编辑与移动组织
    role-list.tsx                       # ItemGroup 导航 + InputGroup 搜索 + 选中回调
    user-list.tsx                       # ItemGroup 导航 + InputGroup 搜索 + disabled badge
    role-detail-panel/                  # 角色详情(目录):信息 / 权限分配(diff + 批量) / 已授用户
      index.tsx                         # 容器:头部 + Tabs + 编辑/删除对话框
      role-info-tab.tsx
      role-permissions-tab/             # 权限分配(抽 useRolePermissions hook)
        index.tsx
        use-role-permissions.ts
      role-users-tab.tsx
    user-detail-panel/                  # 用户详情(目录):概览 / 访问权限 / 操作记录
      index.tsx                         # 容器:三 Tabs + 编辑/重置/禁用对话框
      user-access-panel.tsx             # 组织视角 + 授权配置/生效结果内部 Tabs
      user-info-tab.tsx
      effective-permissions-panel.tsx   # 生效/拒绝权限 Table + 来源 Popover
      role-assignments-tab.tsx
      role-assignment-row.tsx
      direct-permissions-tab.tsx
      direct-permission-row.tsx
    user-form.tsx                       # 创建/编辑用户(TanStack Form + zod)
    reset-password-dialog.tsx           # 重置密码弹窗
  hooks/                                # 业务 hook
    use-user-page-state.ts              # orgOptions/getOrgPath 派生(从 route 下放)
    use-iam-capabilities.ts             # 用户授权读/授予/撤销能力矩阵
    use-user-access-data.ts             # 集中编排三组用户授权 GET 状态
  lib/                                  # feature 内工具
    focus-first-invalid-control.ts      # 无效提交聚焦当前表单首个错误控件
    organization-tree.ts                # 树索引、祖先/后代、路径与父节点候选
    iam-actions.ts                      # action delegation(cache 刷新)
    group-by-resource.ts               # 权限按 resource 分组
```

三个 route 只保留 search/context/navigation 适配、权限守卫和 loader。`users-page.tsx` 通过 `renderAuditTimeline(userId)` 接收路由层注入的审计内容，因此 IAM feature 不直接依赖 Audit feature；用户、角色页面也不直接调用 TanStack Router 的 Route API。

`@headless-tree/core` / `@headless-tree/react` 只负责树状态、ARIA 和键盘行为；节点视觉继续使用项目的 shadcn/Base UI、Tailwind 语义 token 和 Lucide。

角色、组织、用户和重置密码表单统一遵循 [TanStack Form 规范](../../conventions/frontend/forms-tanstack.md)：失焦后展示单字段错误；提交后通过 `submissionAttempts` 展示全部错误，`onSubmitInvalid` 聚焦当前表单首个 `aria-invalid` 控件；mutation 在 `onSubmit` 中直接调用生成的 `Apis.*`。

## 工作台与详情组合

- `IamWorkbench` 固定接收 `title`、`description`、`actions`、`navigation`、`detailsOpen`、`onDetailsOpenChange`、Sheet 标题/说明和 `renderDetail(mode)`。
- `>=1280px` 只调用 `renderDetail("card")`，使用 `18rem–20rem` 导航栏和自适应详情栏；`<1280px` 只显示导航，选择后打开最大 `sm:max-w-2xl` 的 Sheet，并仅在打开时调用 `renderDetail("sheet")`。
- `IamDetailSurface` 在桌面使用完整 `CardHeader/CardTitle/CardDescription/CardAction/CardContent`；Sheet 内使用无 Card 边框的普通表面，避免嵌套边框和双滚动。
- Sheet 自身 `overflow-hidden`；详情 Tabs 的活动内容是唯一纵向滚动区。跨越 `1280px` 会重挂载详情，URL 中的实体选择和 Tab 保留，未保存局部草稿不保证跨断点保留。
- 角色、用户、组织的新建操作统一位于 PageHeader；实体编辑、删除、调岗、重置密码和启停操作位于详情 Header，信息 Tab 只展示数据。
- 角色/用户导航使用 shadcn `ItemGroup + Item`，组织树保留 Headless Tree ARIA/键盘模型并对齐同一行高、hover、focus 和 muted 选中态。搜索统一使用 `InputGroup`。
- 角色与用户详情使用 `TabsList variant="line"`，窄屏触发器容器可横向滚动。信息/授权表单/历史限制为 `max-w-3xl/4xl`，权限矩阵保持全宽。

## 用户授权

`UserDetailPanel` 将原五个入口收敛为「概览 / 访问权限 / 操作记录」。只有具备 `assignments.read` 时显示访问权限；无权限的旧授权深链接回退到概览且不发起授权请求。「访问权限」先明确组织视角，并常驻提示所有授权操作作用于该组织；内部用「授权配置 / 生效结果」Tabs 分开操作任务与验证任务，默认进入授权配置。角色、例外和生效结果三个 GET 由 `useUserAccessData` 集中编排，组织变化时同时刷新；各区块独立处理加载、失败、重试和空状态，单个失败不阻塞其余内容。

- **授权配置**：角色授权置于首屏，例外规则直接展示，不使用业务 Card 嵌套或 Accordion。摘要只使用中性文本和 secondary Badge。角色与例外的新增/编辑均使用标准居中 Dialog，标题下显示用户与完整组织路径；mutation 期间禁用提交与关闭，失败保留输入。角色权限变化只在“查看明细”中只读展开。
- **例外规则**：信息图标只解释概念且支持键盘聚焦。选择 deny 后立即显示 destructive Alert，列出当前会被覆盖的角色来源；关键风险不藏在 Tooltip。直接授权仍是特殊补充/拒绝手段，不作为常规授权首选。
- **生效结果**：后端 `IAM.listUserPermissions` 直接返回 `effective + denied`，前端不做 N+1。全宽 Table 展示权限、资源和来源；单来源直接显示角色与组织，多来源使用 Popover，避免逐行 Accordion 扩张页面。有对应读权限时显示“查看角色”和“切换到此组织视角”，否则保持纯文本。被 deny 抵消的权限单列展示被抑制来源与拒绝来源；无拒绝项时显示紧凑空状态。
- **有效期编辑**：角色行提供「修改有效期」，例外行提供「编辑」。编辑时身份只读，清除 DatePicker 显式发送 `null`；新增留空省略 `expiresAt`，保留现有续期语义。

**组织选择器**解决「祖先 org 授的授权在 home org 视角不可见不可撤销」：`listUserRoles`/`listUserDirectPermissions` 用 `eq(orgId)` 只返回该 org 直接授权，有效权限走祖先继承 CTE；切换组织选择器可逐个 org 查看直接授权与生效全集，来源 badge 的组织点击可快速跳到祖先 org 视角。

过期用 DatePicker（react-day-picker v10 + Base UI Popover 薄包装），日期粒度；已过期记录明确标记。授予/撤销后通过 `IAM_ACTIONS` 主动刷新相关 watcher；仅依赖 `hitSource` 删除缓存不足以更新已挂载视图。查看授权需 `assignments.read`；角色授予还需 `roles.read`，直接权限授予还需 `permissions.read`，无能力时不请求受限 catalog；无对应写权限的控件不显示，且对自己的行隐藏撤销。后端 `deleteUserRole`/`deleteUserPermission` 禁止对自己操作，防自我降级锁死。资源操作历史使用 by-resource API 的资源读权限，不额外要求 `audit.read`。

角色权限配置默认是查看态，仅呈现已授权限；自定义角色通过“编辑权限”显式进入矩阵。编辑器显示新增/撤销摘要，并在具备 `assignments.read` 时预览已授用户影响范围。多项变更仍只在一次“保存更改”中调用一次差量 `PATCH /api/v1/roles/{roleId}/permissions`；失败保留草稿。切换角色/Tab、关闭移动详情、侧栏导航、浏览器后退或关闭页面时，未保存草稿均有离开确认。界面称 `code` 角色为“系统内置”、`instance` 角色为“自定义”，底层契约不变。

> 续期语义：重复授角色/权限时，提供 `expiresAt` 则更新（续期），省略则保留原过期时间，显式传 `null` 则清空为永久。管理 UI 通过编辑入口支持有限期与永久之间双向切换。

## 自助授权来源

账户设置的「授权」Tab 调用 `GET /api/v1/me/authorization`，只需认证即可查看自己的 Home org、祖先组织的原始角色/直接授权（含过期与 deny）以及当前有效权限的来源链。它不依赖 `assignments.read`，也不允许指定其他用户或组织；管理端的用户详情仍使用 `assignments.read` 读取目标用户授权。

## 用户管理

`UserList` 为完整用户管理（参照 ProjectList 细粒度门控范式）：

| 操作 | 权限 | 交互 |
| --- | --- | --- |
| 进页 / 列表 | `users.read` | 路由守卫 + 侧栏 |
| 新建 | `users.create` | 顶部「新建用户」→ Dialog + `user-form`（name/email/password） |
| 编辑 | `users.update` | 用户详情头部「编辑」→ `user-form`（name/email，无密码） |
| 调岗 | `users.update` | 用户详情头部「调岗」-> Dialog 选目标组织 + `transferUserOrganization`（非自己;旧独有 grant 自动清理,共同祖先保留） |
| 重置密码 | `users.reset-password` | 用户详情头部「重置密码」→ `reset-password-dialog`（newPassword min 8） |
| 禁用 | `users.disable` | 用户详情头部 AlertDialog 确认；**禁止对自己**（按钮隐藏；后端亦 403） |
| 启用 | `users.enable` | 已禁用用户在详情头部显示「启用」 |
| 授权 | `assignments.read` + `roles.read` + `permissions.read` + (`assignments.grant` 或 `assignments.revoke`) | 见上节 |

- **disabled badge**：`disabled === true` → destructive「已禁用」，否则 secondary「正常」。
- **currentUserId**：由路由 `auth.user.id` 传入，用于自禁用 UX。
- **缓存**：`IAM.listUsers` hitSource = `[createUser, updateUser, disableUser, enableUser]`（**不含** `resetUserPassword`：重置不改列表字段）；mutation 成功后 `send()` 双保险刷新。

## 组织树数据

- 后端 `listOrganizations` 返回扁平 `Organization[]`，前端以 `id` 建索引并按 `parentId` 构建层级。
- 父组织缺失的节点提升到根层，避免数据静默消失。
- 遍历使用 visited 集合并防御性断开脏数据环；后端 PATCH 防环仍是最终一致性边界。
- 编辑父组织时排除自身及全部后代；Select 显示“总部 / 产品中心”形式的完整路径。
- 提交父组织变更前明确提示继承权限路径会变化，确认后才调用更新 API。
- 同步数据源更新后调用 Headless Tree `scheduleRebuildTree()`，让 alova 刷新结果进入可见树。

## 交互与响应式

- `>=1280px`：左侧角色/组织/用户导航，右侧当前实体详情。
- `<1280px`：只显示导航，点击或按 Enter/Space 选择后用 Sheet 展示详情；关闭 Sheet 不清除 URL 选择。
- 详情提供“新建子组织”、编辑和删除；不提供新建根组织，系统根不显示删除/移动入口。
- 有直接子组织时禁用删除入口；后端 409 继续兜底。
- 搜索遵循 Headless Tree 原生语义：高亮匹配、移动焦点，不从 DOM 中过滤非匹配节点。
- 支持 Up/Down、Left/Right、Home/End、Enter/Space 和输入搜索；焦点状态与选中状态分离显示。

角色权限编辑器的资源分组使用自平衡 CSS 分栏：移动端单列、`xl` 两列、`2xl` 三列。用户生效结果使用全宽 Table；窄屏由 Table 容器横向滚动，来源文本可换行，不给页面增加第二个横向滚动。权限草稿滚动区与差量保存条分离，保存条在编辑态保持可见，仍只发送一次批量 PATCH。操作记录限制阅读宽度，详情展开入口使用自适应宽度的 link Button。

## API 与缓存

- 列表：`useRequest(() => Apis.IAM.listOrganizations())` 等。
- 写操作：直接调用生成的 Method，成功后 `send()` 刷新当前列表状态。
- `api/method-config.ts` 已通过 mutation `name` + list `hitSource` 自动失效列表缓存；授权变更也会失效账户页的 `IAM.getMyAuthorization`，已打开的面板通过 action delegation 重拉。
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
- 自助授权 API：`GET /api/v1/me/authorization`（仅认证，当前用户不可查询他人）
- 运行时配置控制决策：[ADR-0007](../../adr/0007-runtime-config-control.md)
