---
status: Active
owner: frontend-platform
lastReviewedAt: 2026-06-11
---

# Frontend App

这是 workspace 中的前端基础壳应用，使用 React、TypeScript、Vite、Tailwind CSS 和 shadcn/ui。

## 当前状态

- 入口：`src/main.tsx`。
- 主应用：`src/App.tsx`。
- 已配置 Vite、React、Tailwind CSS 和 shadcn/ui。
- 已包含基础 `Button` 组件示例。
- 当前尚未接入后端 API、路由系统或业务页面。

## 常用命令

从仓库根目录运行：

```bash
pnpm --filter frontend dev
pnpm --filter frontend build
pnpm --filter frontend lint
pnpm --filter frontend typecheck
pnpm --filter frontend preview
```

在 `apps/frontend` 目录内也可以运行对应脚本：

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm preview
```

## shadcn/ui

UI 组件放在 `src/components/ui`。当前示例：

```tsx
import { Button } from "@/components/ui/button";
```

新增 shadcn/ui 组件时，在 frontend package 上下文中运行 CLI，并保持组件输出到现有 `src/components` 结构。
