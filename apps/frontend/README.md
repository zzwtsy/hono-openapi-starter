# Frontend

React 管理端应用，提供登录与账户设置、Dashboard、用户/角色/组织管理、项目管理、系统设置和操作日志界面。

主要技术栈：React 19、Vite、TanStack Router / Form / Table、alova、`@alova/wormhole`、Tailwind CSS、Base UI（shadcn）和 Vitest。

> 除非特别说明，本文命令均从仓库根目录执行。全仓安装、数据库初始化和前后端联合启动见[根 README](../../README.md)。

## 快速开始

### 1. 创建环境配置

```sh
cp apps/frontend/.env.example apps/frontend/.env
```

开发环境默认将 `/api` 代理到 `http://localhost:3001`，因此 `VITE_API_BASE_URL` 可以留空。部署为前后端不同域名时，将它设置为后端公开地址。

`VITE_` 前缀变量会暴露给浏览器，禁止写入密钥、数据库连接串或其他敏感信息。

### 2. 启动前后端

前端依赖后端认证和业务 API，建议分别在两个终端启动：

```sh
pnpm --filter backend dev
```

```sh
pnpm --filter frontend dev
```

前端默认访问地址是 `http://localhost:5173`。

## 目录边界

```txt
src/
├── main.tsx              # React 挂载与全局展示 Provider
├── app.tsx               # 会话恢复与 RouterProvider
├── router.tsx            # TanStack Router 实例与类型注册
├── routes/               # 文件路由与权限守卫，只做页面装配
├── features/             # 按业务垂直切片的页面能力
├── components/
│   ├── ui/               # shadcn 生成组件
│   ├── shared/           # 手写跨 feature 复用组件
│   └── layout/           # 全局布局
├── hooks/                # 通用 hooks
├── lib/                  # 请求、认证和通用工具
├── types/                # 跨 feature 通用类型
├── api/                  # 生成 API、alova client、method 配置与装配入口
└── test/                 # 测试环境、MSW handlers 与辅助设施
```

核心约束：

- `routes/` 是装配层，只负责路由定义、守卫、loader、URL 状态适配和跨 feature 组合；
- 业务逻辑与 UI 放在 `features/<feature>`，feature 之间禁止直接依赖；
- 可复用能力下沉到 `components/`、`hooks/`、`lib/` 或 `types/`，通用层不能反向依赖 feature；
- `components/ui/` 是 shadcn vendored 生成物，`components/shared/` 才是项目手写共享组件；
- `src/api/createApis.ts`、`src/api/apiDefinitions.ts`、`src/api/globals.d.ts` 和 `src/routeTree.gen.ts` 是生成物，不要手工修改；`api/client.ts` 与 `api/method-config.ts` 是手写配置。

依赖方向由 ESLint `boundaries` 规则强制。完整说明见[前端目录结构](../../docs/architecture/frontend/directory-structure.md)。

## OpenAPI 客户端生成

后端 API 变化后，先确保后端开发服务可通过 `http://localhost:3001/openapi.json` 访问，再运行：

```sh
pnpm --filter frontend gen:api
```

生成器读取后端 OpenAPI 契约并更新 `src/api/`。生成后需要：

1. 检查生成文件 diff；
2. 更新受影响的页面和请求调用；
3. 运行前端类型检查、测试和构建；
4. 将生成物与后端契约改动一起提交。

请求统一通过 alova 和生成的 `Apis.*` 发起，不要为简单调用额外包装一层无语义 API service。详细约定见 [alova API 规范](../../docs/conventions/frontend/api-alova.md)。

## 路由与 feature 工作流

新增页面时：

1. 在 `src/features/<feature>/` 内实现业务组件、hooks 和工具；
2. 在 `src/routes/` 新增薄路由文件；
3. 受保护页面在 `beforeLoad` 中执行登录或权限守卫；
4. 关键数据可在 `loader` 中预取；
5. 让 Vite 插件更新 `src/routeTree.gen.ts`，不要手改路由树；
6. 补充页面、交互或路由测试。

复杂表单统一使用 TanStack Form + Zod + shadcn Field；alova 继续只负责请求。相关约定见[表单规范](../../docs/conventions/frontend/forms-tanstack.md)。

## shadcn 组件

项目使用 Base UI 风格的 shadcn 组件，本地 CLI 已作为 frontend devDependency 安装。添加组件时运行：

```sh
pnpm --filter frontend exec shadcn add button
pnpm --filter frontend lint:fix
```

生成文件进入 `src/components/ui/`。需要项目级封装时，在 `src/components/shared/` 组合生成组件，不要直接把业务逻辑写入 vendored UI。

## 测试与质量门禁

| 目标 | 命令 | 说明 |
| --- | --- | --- |
| lint | `pnpm --filter frontend lint` | 仅检查前端 |
| lint 修复 | `pnpm --filter frontend lint:fix` | 自动修复可修复问题 |
| 类型检查 | `pnpm --filter frontend typecheck` | 检查应用 TypeScript |
| 测试 | `pnpm --filter frontend test` | Vitest + Testing Library + MSW |
| 监听测试 | `pnpm --filter frontend test:watch` | 本地增量运行 |
| 构建 | `pnpm --filter frontend build` | 类型检查并生成生产产物 |
| 预览构建 | `pnpm --filter frontend preview` | 本地预览已构建产物 |
| 生成 API | `pnpm --filter frontend gen:api` | 需要后端 OpenAPI 可访问 |

涉及视觉或交互变化时，单元测试与构建不能替代浏览器验证；还应实际检查关键交互、响应式布局和控制台错误。

## 相关文档

- [前端目录结构](../../docs/architecture/frontend/directory-structure.md)
- [前端请求生命周期](../../docs/architecture/frontend/request-lifecycle.md)
- [前端开发流程](../../docs/conventions/frontend/development-workflow.md)
- [路由规范](../../docs/conventions/frontend/routing.md)
- [alova API 规范](../../docs/conventions/frontend/api-alova.md)
- [TanStack Form 表单规范](../../docs/conventions/frontend/forms-tanstack.md)
- [状态与缓存](../../docs/conventions/frontend/state-cache.md)
- [前端测试规范](../../docs/conventions/frontend/testing.md)
