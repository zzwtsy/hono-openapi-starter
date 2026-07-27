---
status: Active
owner: frontend
lastReviewedAt: 2026-07-26
---

# 前端目录结构

FSD(Feature-Sliced Design)4 层架构:App / Pages / Features / Shared。依据 [FSD Layers](https://feature-sliced.design/docs/reference/layers)("不必用所有层,典型 Shared+Pages+App")。不引入 entities/widgets(项目无独立业务实体模型/页面级复用块)。

## 目录树

```txt
apps/frontend/src/
  main.tsx                # 挂载入口(StrictMode + ThemeProvider + App,index.html 指向)
  app/                    # App 层:入口 + router + 全局 layout
    app.tsx               # RouterProvider + useSession 注入 context
    router.tsx            # createRouter + Register 类型
    layouts/
      authenticated-layout.tsx  # 受保护区布局(Sidebar + Inset)
      app-sidebar.tsx     # 全局侧边栏(依赖 features/auth 的 useLogout,app 层可依赖 all)
  routes/                 # TanStack 文件路由(薄装配层)
    __root.tsx            # createRootRouteWithContext<{ auth }>
    _authenticated.tsx    # 登录守卫 layout + getMe 取 permissions
    index.tsx             # / -> redirect /dashboard
    login.tsx 403.tsx
    _authenticated/
      dashboard.tsx       # beforeLoad requirePermission + loader + component 引用 pages
      iam/{users,roles,organizations}.tsx
      projects/index.tsx
      settings.tsx
  pages/                  # Pages 层:页面组件(组装 features 成页面)
    dashboard/            # DashboardPage
    iam/{users,roles,organizations}/
    projects/ settings/ login/ forbidden/
  features/               # Features 层(垂直切片,model/ui/lib segments)
    iam/
      model/              # organization-tree, iam-actions, permission-format, use-user-page-state, use-role-permissions
      ui/                 # user-detail-panel/ role-detail-panel/ organization-explorer/ ...
      lib/                # group-by-resource(feature 内复用)
    auth/{model,ui}       # model: use-login; ui: login-form
    projects/ui/          # project-list, project-form
    settings/ui/          # settings-page
  shared/                 # Shared 层(基础设施,ui/lib/api/config segments)
    ui/                   # shadcn 生成 + 自定义跨 feature 复用 + layout
    lib/                  # 工具 + hooks + 类型(FSD 无 hooks/types segment,归 lib)
    api/                  # @alova/wormhole 生成(index.ts 可编辑,其余生成勿改)
    config/               # env
```

## 顶层目录职责

### `app/`(App 层)
入口 + router + 全局 layout。可依赖所有层(app -> all)。全局 layout(AuthenticatedLayout/AppSidebar)放此(依赖 features/auth 的 useLogout,shared 不应依赖 features)。

### `routes/`(路由定义,薄)
TanStack 文件路由。只做:`createFileRoute` + `beforeLoad` 守卫 + `loader` 预取 + `validateSearch` + `component` 引用 pages/app。不含业务逻辑/UI 渲染/复杂 state。

### `pages/`(Pages 层)
页面组件(组装 features 成页面)。依赖 features + shared。route 文件 `component` 引用此层。

### `features/`(Features 层)
垂直切片,业务内聚。每个 feature 自包含 segments:
- `model/`:数据模型/业务逻辑/纯函数/hook
- `ui/`:组件
- `lib/`:feature 内复用

**feature 间不直接 import**(跨 feature 走 pages 装配或下移 shared,eslint boundaries 强制)。

### `shared/`(Shared 层)
跨 feature 基础设施。segments(FSD 弃 `components/hooks/types` 坏名,按目的分):
- `ui/`:shadcn 生成(button/card 等)+ 自定义跨 feature 复用(async-list/confirm-delete-dialog/page-header 等)+ layout(auth-layout)
- `lib/`:工具函数(auth-client/permissions/require-permission/safe-redirect/utils)+ hooks(use-media-query/use-toast-mutation/use-permissions/use-auth/use-mobile)+ 类型(auth/permissions)
- `api/`:wormhole 生成
- `config/`:环境变量

shared 内部 segments 互相 import 自由(FSD shared 是层+slice 例外)。

## 依赖边界(eslint boundaries 强制)

| from | 允许 to |
| --- | --- |
| app | all(app/routes/pages/features/shared) |
| routes | app/pages/features/shared |
| pages | features/shared |
| features | shared(**features 间 disallow**) |
| shared | shared(内部自由) |

## 生成器配置

- **shadcn**(`components.json`):aliases 指向 `@/shared/*`(`ui`->`@/shared/ui`、`lib/hooks`->`@/shared/lib`、`utils`->`@/shared/lib/utils`)。官方支持 `aliases.ui` 自定义安装目录(见 [shadcn components.json](https://ui.shadcn.com/docs/components-json))。
- **wormhole**(`alova.config.ts`):`output: "src/shared/api"`。生成物入 git(克隆即用),eslint ignore `shared/api/*`(除 `index.ts` 手写)。

## feature 内 segments(按需,不强制)

- 简单 feature:只 `ui/`(如 projects/settings)
- 复杂 feature:`model/` + `ui/` + `lib/`(如 iam)

判断标准:封装必须注入价值(复用策略/业务语义),否则不为封装而封装(见 [code-style](../../conventions/frontend/code-style.md) + [api-alova](../../conventions/frontend/api-alova.md))。

## main.tsx 位置

`main.tsx` 留 `src/` 根(index.html 指向 `src/main.tsx`,不改 vite 入口)。app 层含 `app.tsx`/`router.tsx`/`layouts/`。main.tsx 是挂载入口(StrictMode + ThemeProvider + App),引用 `./app/app.tsx`。
