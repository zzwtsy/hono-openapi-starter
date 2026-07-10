---
status: Active
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端认证规范(Better Auth client)

## Better Auth client

`src/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  fetchOptions: { credentials: "include" },
});

export const { useSession, signIn, signOut } = authClient;
export type Session = NonNullable<ReturnType<typeof authClient.useSession>["data"]>;
```

- 同源访问(`/api/auth` 经 vite proxy -> 后端),cookie 自动携带。
- `useSession` 管登录态;`signIn`/`signOut` 触发 atom signal 自动 rerender。

## cookie 模式

后端 Better Auth 同时支持 cookie(`better-auth.session_token`)与 bearer(见 [backend/auth-better-auth](../backend/auth-better-auth.md))。前端 SPA 同源用 **cookie 模式**:

- vite proxy `/api` -> `http://localhost:3001`,同源,cookie 自然携带。
- alova `GlobalFetch` 同源默认带 cookie(显式 `credentials: "include"` 保险)。
- prod 同源部署或反代。

bearer 模式用于跨域/移动/SSR,SPA 同源不必。

## session 注入 router context

`App.tsx`:

```tsx
const { data: session, isPending } = useSession();
if (isPending) return <Splash />;
return <RouterProvider router={router} context={{ auth: { session } }} />;
```

- session 来自 `useSession`(React-land),通过 `<RouterProvider context>` 注入。
- 等 `isPending` 结束再渲染,避免 beforeLoad 拿到未 resolve 的 session。
- 登录后 `router.navigate` 到回跳目标(触发 `_authenticated` 重取 permissions);登出后 `router.invalidate()` 重走守卫。详见 [routing](./routing.md)。

## permissions

permissions 不在 Better Auth session,来自业务 `/api/v1/me`(`{ user, permissions }`)。在 `_authenticated` beforeLoad 调 `Apis.Me.getMe()` 取,放 context.auth.permissions(见 [routing](./routing.md))。

## CSRF

cookie 模式下业务 API 有 CSRF 面。后端 Better Auth cookie `SameSite` 默认(当前未显式配),同源 + vite proxy 下 `SameSite=Lax` 缓解。业务 API 非 GET 的 CSRF 面由后端确认(不阻塞前端)。

## Better Auth 端点不经 alova

`/api/auth/*` 不包 envelope(见 [backend/auth-better-auth](../backend/auth-better-auth.md) + ADR-0003),前端用 Better Auth client 调,不经 alova。业务 API(`/api/v1/*`)包 envelope,走 alova(见 [api-alova](./api-alova.md))。
