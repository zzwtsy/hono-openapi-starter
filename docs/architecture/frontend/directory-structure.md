---
status: Active
owner: frontend
lastReviewedAt: 2026-07-27
---

# 前端目录结构

扁平 feature-based 结构:顶层 components/hooks/types/lib/api + feature 内 components/hooks/lib/types。不引入 FSD 分层(对模板项目过重),依赖方向由 eslint `boundaries` 强制。

## 目录树

```txt
apps/frontend/src/
  main.tsx              # 挂载入口(StrictMode + ThemeProvider + render App)
  router.tsx            # createRouter + Register 类型增强(纯定义,独立文件)
  app.tsx               # App 组件(useSession + RouterProvider,isPending 时 null)
  routes/               # TanStack 文件路由(薄:route 定义 + beforeLoad + loader + component)
    __root.tsx          # createRootRouteWithContext<{ auth }>
    _authenticated.tsx  # 登录守卫 layout + getMe 取 permissionCodes + wrapper 取 useLogout
    index.tsx           # / -> redirect /dashboard
    login.tsx 403.tsx
    _authenticated/
      dashboard.tsx     # 简单页面:route 内联局部 function
      iam/{users,roles,organizations}.tsx  # users/roles 含 UsersPage/RolesPage(route 装配)
      projects/index.tsx settings.tsx
  components/
    ui/                 # shadcn 生成物(vendored 不手改,components.json aliases.ui,eslint 豁免)
    shared/             # 自定义跨 feature 复用(async-list/can/confirm-delete-dialog/date-picker/
                        #   error-boundary/list-skeleton/page-header/resource-actions/theme-toggle)
    layout/             # 全局 layout(authenticated-layout/app-sidebar/auth-layout)
  hooks/                # 通用 hook(use-auth/use-media-query/use-mobile/use-permissions/use-toast-mutation)
  types/                # 通用类型(AuthState/PermissionCode/PermissionRef)
  lib/                  # 工具函数 + auth-client + env(utils/permissions/require-permission/safe-redirect)
  api/                  # @alova/wormhole 生成(index.ts 可编辑,其余生成勿改,eslint ignore)
  features/             # 业务能力(垂直切片,feature 间不直接 import)
    iam/
      components/       # IAM 组件(user-detail-panel/role-detail-panel/organization-explorer/...)
      hooks/            # IAM 业务 hook(use-user-page-state)
      lib/              # IAM 工具(organization-tree/iam-actions/permission-format/group-by-resource)
      organizations-page.tsx  # page 组装(feature 根)
    auth/
      components/       # login-form
      hooks/            # use-login
    projects/components/  # project-list, project-form
    settings/components/  # settings-page
```

## 顶层目录职责

### `main.tsx` / `router.tsx` / `app.tsx`
入口三分离:`main.tsx`(render)+ `router.tsx`(createRouter 定义,独立无循环)+ `app.tsx`(App 组件,useSession + RouterProvider)。依赖单向:main -> app -> router。

### `routes/`(路由定义)
TanStack 文件路由。`createFileRoute` + `beforeLoad` 守卫 + `loader` 预取 + `validateSearch` + `component`。简单页面(dashboard/403/login/projects/settings)route 内联局部 function;复杂页面(iam)route 含页面组件(UsersPage/RolesPage,用 Route hook)或引用 feature page(organizations,route wrapper 传 props)。

### `components/`
- `ui/`:shadcn 生成物(vendored,不手改,eslint 豁免 react-refresh/strict-boolean 等;`components.json` `aliases.ui` 指此)
- `shared/`:自定义跨 feature 复用组件(`components.json` `aliases.components` 指此)
- `layout/`:全局 layout(authenticated-layout/app-sidebar)。app-sidebar 用 `onLogout` prop,不直接依赖 features/auth(boundaries:components 不依赖 features)

### `hooks/` / `types/` / `lib/` / `api/`
通用基础设施。`api/` 是 wormhole 生成(入 git,eslint ignore `api/*` 除 `index.ts`)。

### `features/`
垂直切片,业务内聚。feature 内:`components/`(组件)+ `hooks/`(业务 hook)+ `lib/`(feature 工具)+ `types/`(如有)。page 组装放 feature 根(`features/iam/organizations-page.tsx`)。

## 依赖边界(eslint boundaries 强制)

| from | 允许 to |
| --- | --- |
| routes | features/components/hooks/lib/types/api |
| features | components/hooks/lib/types/api(**features 间 disallow**) |
| components/hooks/lib/types | 同层自由(**不依赖 features/routes**,防反向依赖) |
| api | api/lib/types |

关键:features 间不直接 import(跨 feature 走 routes 装配或下移 components/hooks/lib);通用代码(components/hooks/lib/types)不反向依赖 features。

## 生成器配置

- **shadcn**(`components.json`):`aliases.ui` = `@/components/ui`(生成物)、`aliases.components` = `@/components/shared`(自定义)、`lib/hooks/utils` 指顶层。官方支持自定义 aliases(见 [shadcn components.json](https://ui.shadcn.com/docs/components-json))。
- **wormhole**(`alova.config.ts`):`output: "src/api"`。生成物入 git(克隆即用),eslint ignore `api/*`(除 `index.ts` 手写)。

## shadcn 生成物 vs 自定义组件

`components/ui/`(shadcn 生成,vendored 不手改,eslint 豁免)与 `components/shared/`(手写跨 feature 复用,正常 lint)分离。新 shadcn 组件 `shadcn add` 生成到 `components/ui/`,不污染 `components/shared/`。

## feature 内结构(按需)

- 简单 feature:只 `components/`(如 projects/settings)
- 复杂 feature:`components/` + `hooks/` + `lib/` + `types/`(如 iam)

判断标准:封装必须注入价值(复用策略/业务语义),否则不为封装而封装(见 [code-style](../../conventions/frontend/code-style.md) + [api-alova](../../conventions/frontend/api-alova.md))。
