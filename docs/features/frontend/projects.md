---
status: Active
owner: frontend
lastReviewedAt: 2026-07-14
---

# 前端 projects

## 概述

项目列表与管理界面,提供项目 CRUD(创建/编辑/删除)入口。中等 feature CRUD UI 范式参照 IAM RoleList,差异在于 projects 使用细粒度写权限。

## 范围

- 包含:项目列表(Table + 三态)、创建/编辑(Dialog + 表单)、删除(AlertDialog 确认)。
- 不包含:组织名映射(展示 orgId 字符串)、项目详情页(本期 list 内联管理)。

## 路由

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/projects` | `requirePermission("projects.read")` | `listProjects` | `ProjectList` |

写权限(`projects.create`/`update`/`delete`)不进路由守卫(必须能看列表),只在组件层用 `useCan`/`<Can>` 控入口。

## 组件结构

```txt
features/projects/
  components/
    ProjectList.tsx        # 列表 + 操作列 + Dialog/AlertDialog 宿主
    project-form.tsx       # 创建/编辑表单(TanStack Form + zod)
```

`ProjectList` 宿主 `useRequest(() => Apis.Projects.listProjects())`;写操作直接 `await Apis.Projects.{create,update,delete}Project(...)`,成功调 `send()` 刷新列表 + alova `hitSource` 自动失效。

## 权限

后端是细粒度写权限(与 IAM 单一 `iam.manage` 不同),前端按权限分别门控入口:

- `projects.read`:路由 `beforeLoad`(进列表)
- `projects.create`:`useCan` 控"新建项目"按钮
- `projects.update`:`useCan` 控"编辑"菜单项
- `projects.delete`:`useCan` 控"删除"菜单项
- 操作列与表头:`canUpdate || canDelete` 才渲染(两者皆无则整列不显示)

前端权限只控 UX;后端 `PermissionChecker` 才是授权边界。

## API 与缓存

- 列表:`useRequest(() => Apis.Projects.listProjects())`,loader 预取缓存命中。
- 写:`Apis.Projects.createProject({ data })` / `updateProject({ pathParams: { projectId }, data })` / `deleteProject({ pathParams: { projectId } })`。
- `api/index.ts` 的 `$$userConfigMap`:`Projects.listProjects.hitSource = [createProject, updateProject, deleteProject]`,三个 mutation 标 `name`;mutation 成功自动失效列表 cache(声明式),`send()` 双保险立即重绘。

## 表单

`project-form.tsx` 用 `@tanstack/react-form` + zod(zod v4 standard schema,无 adapter)。`project` prop 传入 = edit 预填,不传 = create。`description` 空串:create 发 `undefined`,update 发 `null`(清空)。提交 `form.Subscribe` 控制 button busy + `Spinner`。

## 与后端对应

- 后端 feature 文档:[`docs/features/backend/projects.md`](../backend/projects.md)
- 后端 API:`GET/POST /api/v1/projects`、`GET/PATCH/DELETE /api/v1/projects/{projectId}`
