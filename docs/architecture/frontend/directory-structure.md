---
status: Active
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端目录结构

## 目录树

```txt
apps/frontend/src/
  main.tsx                # 挂载入口(StrictMode + ThemeProvider + App)
  App.tsx                 # useSession 注入 RouterProvider context
  router.tsx              # createRouter + Register 类型
  index.css

  routes/                 # 文件路由(薄装配层)
    __root.tsx            # createRootRouteWithContext<{ auth }>
    _authenticated.tsx    # 登录守卫 layout + getMe 取 permissions
    index.tsx             # / -> redirect /dashboard
    login.tsx
    403.tsx
    _authenticated/
      dashboard.tsx
      iam/roles.tsx       # beforeLoad requirePermission + loader 预取
      projects/index.tsx

  features/               # 垂直切片(能力层)
    auth/
      hooks.ts            # useLogin/useLogout(signIn + router.invalidate)
      components/LoginForm.tsx
    iam/
      organization-tree.ts # 组织树索引、路径与后代计算
      components/
        RoleList.tsx
        OrganizationExplorer.tsx
        organization-tree.tsx
        organization-details.tsx
    projects/
      components/ProjectList.tsx

  lib/                    # 跨 feature 基础设施
    auth-client.ts        # Better Auth client + Session 类型
    env.ts                # 环境变量校验(zod fail-fast)
    require-permission.ts # 前端权限守卫 helper
    safe-redirect.ts      # open-redirect 防御(登录回跳目标校验)
    utils.ts              # cn 等

  components/
    layout/               # 布局组件(AppSidebar)
    ui/                   # shadcn 生成(Base UI)

  api/                    # @alova/wormhole 生成(入 git,eslint ignore)
    index.ts              # 可编辑:alova 实例 + envelope 剥离
    createApis.ts         # 生成勿改
    apiDefinitions.ts     # 生成勿改
    globals.d.ts          # 生成勿改
```

## 顶层目录职责

### `routes/`(装配层)

文件路由,薄。只做:路由定义、`beforeLoad` 守卫、`loader` 预取、`component` 引用 feature 组件。

不适合:业务逻辑、API 调用封装、复杂状态。

### `features/`(能力层)

垂直切片,业务内聚。每个 feature 自包含:components(必要时 hooks/api)。按需分层(见下)。

### `lib/`

跨 feature 基础设施。`auth-client`、`require-permission`、`utils`。不放业务逻辑。

### `components/ui/`

shadcn 生成的设计系统层(Base UI)。eslint 豁免 `react-refresh`。

### `api/`

`@alova/wormhole` 生成。`index.ts` 可编辑(alova 实例),其余生成勿改。入 git(克隆即用),eslint ignore。

## feature 分层(按需,不强制)

- **简单 feature**:只 `components/`(如 projects 当前)
- **中等 feature**:`components/` + `hooks.ts`(多组件复用同一请求 + 策略)
- **复杂 feature**:`components/` + `hooks.ts` + `api.ts`(业务语义封装:参数转换/聚合)+ `types.ts`

IAM 当前使用 `components/` + 纯数据 helper `organization-tree.ts`；helper 负责树投影和业务规则，不为此引入额外 hooks/api 分层。

判断标准:**封装必须注入价值**(复用策略 / 业务语义),否则直接用 `Apis` + `useRequest`,不为封装而封装(见 [api-alova](../../conventions/frontend/api-alova.md))。

## 依赖边界(eslint boundaries 强制)

| from | 允许 to |
| --- | --- |
| routes | features, lib, ui, api, layout, hooks, types |
| features | lib, ui, api, hooks, types(features 之间 disallow,跨 feature 走 routes 装配) |
| lib | lib, types |
| ui | ui, lib, types, hooks(展示组件可用通用 hook,如 useIsMobile) |
| api | api, lib, types(生成物 eslint-disable 免约束;手写 index.ts 装配 alova 实例,允许 lib/env) |
| layout | features, lib, ui, hooks, types(装配层:侧边栏/页头 shell,接 logout、消费 AuthState) |
| hooks | lib, ui, types, hooks(通用 hook:useCan/useIsMobile) |
| types | api, lib, types(纯类型层,聚合 gen:api 生成的 AppPermission/Me/Session) |

强制规范:

1. `routes` 不能被其他层 import(只由 router 消费);`AuthState` 类型下沉到 `types/auth`,不在 routes 定义(避免 layout 反向依赖 routes)。
2. `features` 之间不直接 import(跨 feature 经 routes 装配或上移 `lib`)。
3. `api` 依赖自身 + alova;手写 `index.ts` 可依赖 `lib/env`(alova 实例 baseURL)。生成物(`createApis`/`apiDefinitions`/`globals.d.ts`)eslint-disable 免约束。
4. `layout` 是页面级 shell 装配(AppSidebar/auth-layout);页面内容区的展示组件(如 PageHeader)归 `ui`,供 features 合法引用。
5. 根文件(`main`/`App`/`router`)不在任何 element,不受 boundaries 约束。
