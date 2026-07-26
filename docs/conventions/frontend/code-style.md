---
status: Active
owner: frontend
lastReviewedAt: 2026-07-26
---

# 前端代码品味与组件规范

本规范约束 `apps/frontend/src`(除 `components/ui/**` shadcn 生成物、`api/**` wormhole 生成物)的代码品味与组件组织。目录分层、依赖边界、API 封装见 [directory-structure](../../architecture/frontend/directory-structure.md)、[api-alova](./api-alova.md);本文件只管"怎么写得好读、好维护"。

## 1. 命名

- **文件名一律 kebab-case**。依据:shadcn 生成物全 kebab(`button.tsx`、`login-form.tsx`),TanStack Router route 文件 kebab + token(`__root.tsx`)。React 官方只要求组件**标识符**(变量名)PascalCase,对文件名无强制;选 kebab 是为了与 `ui/` 生成物一致、避免业务层与设计系统层命名割裂。
- **文件名 = 主导出名的 kebab 形式**,禁止文件名与导出名不一致。如 `user-list.tsx` 导出 `UserListPanel`(不是 `UserList`)。
- 非组件文件(hooks/utils/types/lib)kebab-case,导出用 camelCase(函数/变量)或 PascalCase(类型)。
- 豁免:`api/**` 生成物(`createApis.ts`/`apiDefinitions.ts`)由 wormhole 决定,eslint 已 ignore,不约束。

## 2. 导入与 barrel

- **直接从具体文件导入**,禁止 `index.ts` barrel 聚合业务组件。barrel 损害 tree-shaking 与增量编译(TkDodo *Please Stop Using Barrel Files*)。shadcn 官方亦无 barrel,每组件 `import { Button } from "@/components/ui/button"`。
- 例外(已存在,保留):`api/index.ts`(wormhole 可编辑入口)、`types/index.ts`(纯类型聚合)。这两个是基础设施边界,非业务 barrel。

## 3. route 文件必须薄(≤ 60 行)

route 文件是装配层,只做四件事:`createFileRoute` + `beforeLoad` 守卫 + `loader` 预取 + `component` 引用 feature 组件。

禁止在 route 文件内:业务派生计算、多个 `useState`、复杂 handler、媒体查询 hook。这些下放到 feature 组件或 `hooks/`。

- 正例:[projects/index.tsx](../../../apps/frontend/src/routes/_authenticated/projects/index.tsx)(21 行)、[settings.tsx](../../../apps/frontend/src/routes/_authenticated/settings.tsx)(20 行)。
- 反例(待重构):[users.tsx](../../../apps/frontend/src/routes/_authenticated/iam/users.tsx)(194 行,内联 `useIsNarrowScreen` + 派生 `orgOptions`/`getOrgPath` + 3 个 handler)、[roles.tsx](../../../apps/frontend/src/routes/_authenticated/iam/roles.tsx)(162 行)。

## 4. 组件文件大小

- **单文件 ≤ 300 行**;**单组件函数体 ≤ 150 行**。超过必须拆分。
- 拆分依据是**职责单一与拥挤度**(非硬行数),行数是警戒线:React 官方"a component should only be concerned with one thing; if it ends up growing, decompose into smaller subcomponents"。
- god 组件按 **tab/职责拆子组件 + 抽 mutation hook**。目标拆分见 [iam 重构计划](../../features/frontend/iam-refactor-plan.md)。

## 5. 状态与副作用

遵循 React 官方 *You Might Not Need an Effect*:

- **禁止 render 期镜像 props 到 state**(手动 `prevX` 同步)。用 `key` 重置或派生计算。
  - 反例:[role-detail-panel.tsx:256-260](../../../apps/frontend/src/features/iam/components/role-detail-panel.tsx#L256-L260) `prevInitial`(父级已传 `key={role.id}`,同步完全多余)。
- **禁止 `useEffect` 回调父组件 `setState` 同步受控 prop**。用渲染期 `useMemo` 计算 resolved 值,或把默认选中下放为内部 state + `key` 重置。
  - 反例:[OrganizationExplorer.tsx:75-83](../../../apps/frontend/src/features/iam/components/OrganizationExplorer.tsx#L75-L83)。
- 函数体内大数组/配置对象必须 `useMemo` 或提到模块级,避免每次 render 重建。
  - 反例:[user-detail-panel.tsx:536](../../../apps/frontend/src/features/iam/components/user-detail-panel.tsx#L536) `roleItems`、[ProjectList.tsx:133](../../../apps/frontend/src/features/projects/components/ProjectList.tsx#L133) 内联 `items`。
- 用**判别联合 + 解构**替代非空断言 `!`。
  - 反例:[user-detail-panel.tsx:458](../../../apps/frontend/src/features/iam/components/user-detail-panel.tsx#L458) `source.roleId!`。

## 6. 条件渲染

- **禁止嵌套三元(超过一层)**。React 官方"use ternary in moderation; if messy with nested conditional markup, extract child components"。
- 列表三态(loading / error / empty / data)用早返回子组件,或抽 `<AsyncList>` 复合组件(见 §7)。
- 反例:[role-detail-panel.tsx:377](../../../apps/frontend/src/features/iam/components/role-detail-panel.tsx#L377) 四重嵌套、[user-detail-panel.tsx:580](../../../apps/frontend/src/features/iam/components/user-detail-panel.tsx#L580) 三重。

## 7. 重复治理(跨文件重复必须沉淀)

发现同一模式在 ≥ 2 个文件重复,必须沉淀到 `components/shared/` 或 `hooks/`,禁止复制粘贴:

| 重复模式 | 沉淀目标 | 当前重复点 |
| --- | --- | --- |
| 列表三态 `loading?Skeleton : error?重试 : empty?提示 : 列表` | `components/shared/async-list.tsx` | UserList/RoleList/ProjectList/user-detail L580,L772/role-detail L507(6+ 处) |
| 删除确认对话框(Dialog + AlertDialog + `busy` 守卫) | `components/shared/confirm-delete-dialog.tsx` + `hooks/use-confirm-delete.ts` | user-detail/role-detail/OrgExplorer/ProjectList(4 处) |
| mutation try/catch + `toast.error(err instanceof Error ? ... : "失败")` | `hooks/use-toast-mutation.ts` | 14 处 / 8 文件 |
| `groupByResource` 工具 | `features/iam/components/shared/group-by-resource.ts` | user-detail:60 & role-detail:39(逐字重复) |
| 窄屏断点 `matchMedia` | `hooks/use-media-query.ts`(参数化断点) | users.tsx/roles.tsx/OrgExplorer.tsx + `hooks/use-mobile.ts`(4 处) |

判定与 [api-alova](./api-alova.md) "封装必须注入价值"一致:不为封装而封装,但跨文件复制粘贴必须收敛。

## 8. eslint 强制

[eslint.config.mjs](../../../eslint.config.mjs) 在 `boundaries`(结构)之外补充品味规则,渐进策略:先 `warn`,存量修完升 `error`:

```js
"complexity": ["warn", 15],
"max-lines-per-function": ["warn", { max: 150, skipComments: true }],
"max-lines": ["warn", 300],
"no-nested-ternary": "warn",
"unicorn/filename-case": ["error", { cases: { kebabCase: true } }],
```

`components/ui/**` 生成物单独豁免 `complexity`/`max-lines*`/`no-nested-ternary`(同 `react-refresh` 豁免位置)。`api/**` 已整体 ignore。`unicorn/filename-case` 对生成物 `createApis.ts`/`apiDefinitions.ts` 因 `api/*` ignore 自动豁免。

## 参考(联网核验来源)

- [shadcn Package Imports](https://ui.shadcn.com/docs/package-imports)(kebab 文件名 + 无 barrel,浏览器 MCP 实拉)
- [React: Your First Component](https://react.dev/learn/your-first-component)(标识符 PascalCase)
- [React: Thinking in React](https://react.dev/learn/thinking-in-react)(separation of concerns,decompose)
- [React: Conditional Rendering](https://react.dev/learn/conditional-rendering)(ternary in moderation)
- [TkDodo: Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files)
- [TanStack Router: File Naming Conventions](https://tanstack.com/router/latest/docs/routing/file-naming-conventions)
