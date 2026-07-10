---
status: Active
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端 Feature 文档模板

> 复制本模板到 `docs/features/frontend/<feature>.md` 填写。简单 feature(只有 components)可不写文档,复杂 feature(有 hooks/api/多组件/权限)建议写。

## 概述

<feature 做什么、解决什么问题>

## 范围

- 包含:<端点、页面、组件>
- 不包含:<明确边界>

## 路由

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/_authenticated/<feature>` | `requirePermission("<feature>.read")` | `await Apis.<Feature>.list()` | `<FeatureList />` |

## 组件结构

```txt
features/<feature>/
  components/
    <FeatureList>.tsx
    <FeatureForm>.tsx   # 按需
  hooks.ts              # 按需:多组件复用策略(见 api-alova 按需封装)
  api.ts                # 按需:业务语义封装(参数转换/聚合)
```

## API 调用

- 列表:`useRequest(() => Apis.<Feature>.list())`
- 创建:`await Apis.<Feature>.create({ data: {...} })` + `hitSource` 失效列表
- 预取:关键路由 loader

(见 [api-alova](../../conventions/frontend/api-alova.md))

## 权限

- 所需权限:`<feature>.read` / `<feature>.manage`(与后端 `AppPermission` 一致)
- 守卫:路由 `beforeLoad` 调 `requirePermission`(见 [routing](../../conventions/frontend/routing.md))

## 与后端对应

后端 feature 文档:`docs/features/backend/<feature>.md`
后端 API:`/api/v1/<feature>/*`(OpenAPI,见 [backend/api-openapi](../../conventions/backend/api-openapi.md))
