---
status: Accepted
date: 2026-07-10
---

# ADR-0006:前端架构(垂直切片 + TanStack Router 守卫 + alova)

## 背景

前端从零搭建,需确定架构:目录组织、路由、请求、认证。

## 决策

- **垂直切片**:`features/<feature>/` 能力层 + `routes/` 薄装配层(与后端 features 对称)。
- **TanStack Router 文件路由 + 守卫**:`_authenticated` layout 登录守卫 + 单路由 `requirePermission` 权限守卫;router context 注入 session/permissions。
- **alova 请求**:hook(组件)+ await method(非组件),直传 `Apis`;按需封装 `api.ts`/`hooks.ts`。
- **Better Auth client**:cookie 模式 + vite proxy 同源。
- **@alova/wormhole 生成 API**(见 ADR-0005)。
- **eslint boundaries**:`routes`/`features`/`lib`/`ui`/`api` 依赖方向强制。

## 理由

- 垂直切片:feature 内聚,前后端对称,符合项目风格(ADR-0001)。
- TanStack Router:类型安全路由 + beforeLoad 守卫 + context 注入,契合认证/权限需求。
- alova:hooks + cache + 生成 API,类型安全;按需封装避免过度。
- 守卫非授权边界:前端 UX,后端 `PermissionChecker` 兜底(ADR-0004)。

## 代价

- 文件路由 + 垂直切片边界需 eslint boundaries 强制(routes 单目录扫描)。
- alova 与 `ts/promise-function-async` 冲突(Method thenable),前端 off 该规则。
- 生成物入 git(克隆即用),代价是 spec 变更提交生成代码。

## 关联

- [frontend/directory-structure](../architecture/frontend/directory-structure.md)
- [frontend/api-alova](../conventions/frontend/api-alova.md)
- [frontend/routing](../conventions/frontend/routing.md)
- ADR-0001(垂直切片)、ADR-0004(权限层)、ADR-0005(wormhole)
