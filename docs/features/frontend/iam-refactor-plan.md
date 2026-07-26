---
status: Active
owner: frontend
lastReviewedAt: 2026-07-26
---

# IAM 组件重构执行计划

## 背景

`user-detail-panel.tsx`(870 行)、`role-detail-panel.tsx`(555 行)、`organization-explorer.tsx`(333 行)违反 [code-style §4](../../conventions/frontend/code-style.md)(单文件 ≤ 300 行、单组件函数体 ≤ 150 行)。本计划分步拆解 god 组件并沉淀跨文件重复([code-style §7](../../conventions/frontend/code-style.md)),目标:eslint 品味规则 warn 清零。

## 现状证据(代码审查)

| 文件 | 问题 | 关键证据 |
| --- | --- | --- |
| user-detail-panel.tsx | 9 组件挤一文件、11 useState、2 处三重嵌套三元 | L74-249 容器、L494-676 `RoleAssignmentsTab`(183 行)、L711-840 `DirectPermissionsTab` |
| role-detail-panel.tsx | `RolePermissionsTab` 247 行、render 期镜像 props | L231-477、L256-260 `prevInitial`(父已传 `key={role.id}`,多余) |
| role-detail-panel.tsx | 四重嵌套三元 | L377-474 |
| organization-explorer.tsx | 单组件 259 行、effect 回调父 setState 同步受控 prop | L75-83 |

跨文件重复:`groupByResource` 逐字重复 2 次(user-detail:60 & role-detail:39)、列表三态 6+ 处、`toast.error` try/catch 14 处/8 文件、对话框三件套 4 处、`useIsNarrowScreen` 3 处。

## Phase 1:沉淀基础设施(先做,无行为变更)

拆解前先建可复用件,否则 Phase 2-4 无 shared 可引用。

1. `hooks/use-media-query.ts`:参数化断点 `useMediaQuery(query)`,删除 `users.tsx`/`roles.tsx`/`organization-explorer.tsx` 内联 `useIsNarrowScreen` + `hooks/use-mobile.ts` 改为薄封装。
2. `components/shared/async-list.tsx`:复合组件 `{ loading | error | empty | children }`,替代 6+ 处手写三态。
3. `hooks/use-toast-mutation.ts`:包装 `try { await fn(); toast.success } catch { toast.error }`,替代 14 处样板。
4. `hooks/use-confirm-delete.ts` + `components/shared/confirm-delete-dialog.tsx`:删除确认 + busy 守卫,替代 4 处重写。
5. `features/iam/components/shared/group-by-resource.ts`:消除 2 处重复。

## Phase 2:拆 user-detail-panel.tsx(870 → 多文件 ≤150)

```
features/iam/components/user-detail-panel/
  index.tsx                      # 容器:头部 + orgSelect + Tabs + 对话框装配(<120 行)
  user-info-tab.tsx
  effective-permissions/
    index.tsx                    # 数据获取 + groupByResource 装配
    source-badge.tsx             # 来源 badge + 跳转角色/切视角
  role-assignments-tab/
    index.tsx                    # 列表 + 授予表单装配
    use-role-assign-form.ts      # selectedRoleId/expiresAt/assigning + assignRole mutation
    role-assignment-row.tsx
    role-permission-preview.tsx  # Collapsible 预览
  direct-permissions-tab/
    index.tsx
    use-direct-permission-form.ts
    direct-permission-row.tsx
```

要点:L536 `roleItems` 内联数组提 `useMemo` 或模块级;L458 `source.roleId!` 改判别联合;L580/L772 三态用 `<AsyncList>`。

## Phase 3:拆 role-detail-panel.tsx(555 → 多文件)

```
features/iam/components/role-detail-panel/
  index.tsx                      # 容器
  role-info-tab.tsx
  role-permissions-tab/
    index.tsx                    # 容器:数据获取 + 装配(删 prevInitial,靠 key 重置)
    use-role-permissions.ts      # working/search/viewMode/submitting + diff 派生 + mutation
    permission-search-bar.tsx
    permission-group.tsx         # 单 FieldSet + Checkbox 组
    permissions-diff-bar.tsx     # diff 摘要 + 保存按钮
  role-users-tab.tsx
```

要点:**删除 L256-260 `prevInitial` render 期 setState**(违反 [code-style §5](../../conventions/frontend/code-style.md),`key={role.id}` 已在 L125 传入,同步多余);L377 四重三元用早返回 + `<AsyncList>`;`groupByResource` 引 Phase 1 沉淀。

## Phase 4:拆 organization-explorer.tsx(333 → 多文件)

```
features/iam/components/organization-explorer/
  index.tsx                      # 数据获取 + 选中态(useMemo 替代 effect 回调父 setState)
  organization-explorer-content.tsx  # 双栏 + Sheet
  organization-create-dialog.tsx
  organization-edit-dialog.tsx
  organization-delete-dialog.tsx
  use-organization-dialog-state.ts    # 5 对话框开关 + confirmDelete
```

要点:**L75-83 effect 回调父 `setState` 改渲染期 `useMemo` 算 resolvedId**(违反 [code-style §5](../../conventions/frontend/code-style.md));窄屏用 `useMediaQuery`;L132-231 四分支 `content` 抽 `<ExplorerContent>`。

## Phase 5:收敛列表三态 + 对话框

`role-list.tsx`/`user-list.tsx`/`project-list.tsx` 的手写三态替换为 `<AsyncList>`;`project-list.tsx` 的 3 对话框用 `<ConfirmDeleteDialog>` + 抽 form 组件;L75 双重嵌套三元随之消除。

## 顺序约束与验收

- **Phase 1 必须先**(基础设施);Phase 2-4 可并行;Phase 5 收尾。
- 每个 Phase 独立 PR,便于 review 与回滚。
- 验收门禁:
  - `pnpm --filter frontend typecheck`
  - `pnpm lint`(Phase 5 后品味规则 0 warn)
  - `pnpm --filter frontend test`
  - `pnpm --filter frontend build`

## 不重构项(明确保留)

- `components/resource-actions.tsx`(73 行,良好抽象,被 `project-list` 正确消费,应推广而非拆分)。
- `features/iam/components/organization-details.tsx`(165 行,职责单一,可接受)。
