---
status: Active
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端路由与守卫规范

## 文件路由

TanStack Router 文件路由,`src/routes/` 下文件即路由。`routeTree.gen.ts` 由 vite 插件自动生成(入 git)。

- `_xxx.tsx`:pathless layout route(不进 URL,作 layout + 守卫)。
- `_xxx/`:其下路由受 `_xxx` layout 守卫。
- `index.tsx`:目录的 index 路由。

## 守卫结构

| 路由 | 职责 |
| --- | --- |
| `_authenticated.tsx` | 登录守卫 layout:无 session -> /login;有 -> getMe 取 permissions 下钻 |
| 单路由 `beforeLoad` | 权限守卫:`requirePermission(context.auth.permissions, "iam.read")` |
| `login.tsx` / `403.tsx` | 公开路由(不在 _authenticated 下);`login` 已登录则跳 `/dashboard`,并声明 `redirect` 搜索参数供登录后回跳 |
| `index.tsx` | / -> redirect /dashboard |

### 登录守卫(_authenticated)

```tsx
beforeLoad: async ({ context, location }) => {
  if (!context.auth.session) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
  const me = await Apis.Me.getMe();
  return { auth: { ...context.auth, user: me.user, permissions: me.permissions } };
}
```

受守卫的路由放 `_authenticated/` 下。

### 权限守卫(单路由)

```tsx
beforeLoad: ({ context }) => {
  requirePermission(context.auth.permissions, "iam.read");
}
```

权限名与后端 `AppPermission` 一致(如 `iam.read`、`assignments.manage`、`projects.read`)。

## router context

```tsx
// __root.tsx
createRootRouteWithContext<{ auth: AuthState }>()(...)
```

`AuthState = { session, user?, permissions? }`。session 来自 Better Auth `useSession`(App 注入);user/permissions 在 `_authenticated` beforeLoad 由 `getMe` 填充,下钻子路由。

App 等 `useSession` 的 `isPending` 结束再渲染 RouterProvider,避免 beforeLoad 拿到未 resolve 的 session。

## loader 预取(仅关键路由)

```tsx
loader: async () => {
  await Apis.IAM.listRoles(); // 写 alova cache
}
```

组件 `useRequest(() => Apis.IAM.listRoles())` 命中 cache,无二次请求。

**仅关键路由**(首屏/列表)加 loader;其余 `useRequest` 自取。不每个路由都加 loader(样板重,与 alova hooks 重复)。

## 登录/登出

登录:`signIn` 成功后 `router.navigate` 到回跳目标(或 `/dashboard`),触发 `_authenticated` beforeLoad 取 permissions;`/login?redirect=<href>` 由 `_authenticated` 守卫写入,登录后经 `safeRedirect` 校验回跳(防 open-redirect):

```ts
const { login } = useLogin(); // features/auth/hooks
await login(email, password, redirect); // signIn + router.navigate(safeRedirect(redirect))
```

登出:`signOut` 后 `router.invalidate()` 重走守卫(session 变 null -> `_authenticated` 重定向 `/login`)。

session 过期(alova 401)不走此流程,由 [api-alova](./api-alova.md) 的 `responded` 统一 hard-nav 到 `/login`。

## 守卫不是授权边界

前端守卫只做 UX(挡路由/隐藏菜单)。真正授权在后端 `PermissionChecker`(见 [backend/authorization](../backend/authorization.md))。前端 permissions 缓存过期不构成安全问题。
