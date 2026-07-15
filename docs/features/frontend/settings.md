---
status: Active
owner: frontend
lastReviewedAt: 2026-07-15
---

# 前端系统设置

## 概述

系统设置页提供运行时可编辑配置的管理界面。本期只含一项配置：是否开启用户注册。管理员通过开关切换注册状态，无需改 env 重启。

## 范围

- 包含：配置列表展示、配置编辑（本期：注册开关）。
- 不包含：配置变更审计日志、配置变更通知、除 `signUp` 外的其他 key UI（registry 可扩展）。

## 路由与导航

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/settings` | `requirePermission("settings.read")` | `listSettings` | `SettingsPage` |

侧栏「系统设置」：`permission: "settings.read"`（`app-sidebar.tsx`）。

公开注册页 `/register` 不属本 feature（auth）；关闭注册时由后端 hooks 拒绝，注册表单展示错误文案。见后端 [system-settings](../backend/system-settings.md)。

## 组件结构

```txt
features/settings/
  components/
    SettingsPage.tsx        # 配置列表 + 编辑(本期:注册开关 Switch)
```

## API 调用

- 列表：`useRequest(() => Apis.Settings.listSettings())`，loader 预取缓存命中。
- 编辑：

```ts
Apis.Settings.updateSetting({
  pathParams: { key: "signUp" },
  data: { value: { enabled: next } },
})
```

- 列表中无 `key === "signUp"` 行时，UI 按**关闭**展示（与后端「未配置即禁」一致）。
- 缓存：`Settings.listSettings` hitSource 含 `Settings.updateSetting`；mutation 后 `send()` 刷新。

## 权限

- `settings.read`：路由 `beforeLoad`（进设置页）+ 侧栏显隐。
- `settings.update`：可写 Switch；无该权限时 Switch `disabled` 只读。
- 前端权限只控 UX；后端 `PermissionChecker` 才是授权边界。

## 与后端对应

- 后端 feature 文档：[`docs/features/backend/system-settings.md`](../backend/system-settings.md)
- 后端 API：`GET /api/v1/settings`、`PATCH /api/v1/settings/{key}`（body `{ value: <json> }`）
- 运行时配置控制决策：[ADR-0007](../../adr/0007-runtime-config-control.md)
