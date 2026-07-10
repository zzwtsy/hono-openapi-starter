---
status: Active
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端开发流程

## 日常开发循环

1. 后端 dev 运行(`pnpm --filter backend dev`,提供 openapi.json)
2. 前端 dev(`pnpm --filter frontend dev`,vite proxy + routeTree 生成)
3. 后端 API 变更 -> `pnpm --filter frontend gen:api` 重新生成前端 API(或 VSCode 扩展 autoUpdate)
4. 新增路由 -> 在 `src/routes/` 加文件,vite 插件自动更新 `routeTree.gen.ts`
5. lint:`pnpm --filter frontend lint`;修复:`pnpm --filter frontend lint:fix`

## 新增前端 feature

1. `src/features/<feature>/`:按需建 `components/`(必要时 `hooks.ts`/`api.ts`,见 [api-alova](./api-alova.md) 按需封装)
2. `src/routes/_authenticated/<feature>/`:路由文件(beforeLoad 守卫 + loader 预取 + component 引用 feature 组件)
3. 权限:`beforeLoad` 调 `requirePermission(context.auth.permissions, "<feature>.read")`
4. 文档:更新 `docs/features/frontend/<feature>.md`(若复杂)

## 新增路由

- 公开路由(登录页等):`src/routes/<route>.tsx`
- 受守卫路由:`src/routes/_authenticated/<route>.tsx`
- 路由文件导出 `Route`(`createFileRoute`) + component
- 需守卫:`beforeLoad` 调 `requirePermission`
- 需预取(关键路由):加 `loader`

## shadcn 组件

- 添加:`pnpm dlx shadcn@latest add <component>`
- 添加后跑 `pnpm --filter frontend lint:fix`(shadcn 生成无分号,补分号保持 `semi: true`)
- `components/ui/` eslint 豁免 `react-refresh`(导出 cva 变体)

## 生成物

- `src/api/`(wormhole 生成):入 git,eslint ignore `createApis.ts`/`apiDefinitions.ts`
- `src/routeTree.gen.ts`(router 生成):入 git,eslint ignore

## 质量门禁

- `pnpm --filter frontend typecheck`
- `pnpm -w lint`
- `pnpm --filter frontend build`
