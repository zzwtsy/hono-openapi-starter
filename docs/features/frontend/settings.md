---
status: Active
owner: frontend
lastReviewedAt: 2026-07-16
---

# 前端系统设置

## 概述

系统设置页提供运行时可编辑配置的管理界面。当前无内置配置项（signUp 注册开关已随「移除自助注册」退役，见 ADR-0007）。页面保留空态占位，后续新增配置时在此加 UI。

## 范围

- 包含：设置页空态占位。
- 不包含：配置项 UI（signUp 已退役；后续新增 key 时恢复）、配置变更审计日志。

## 路由与导航

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/settings` | `requirePermission("settings.read")` | - | `SettingsPage` |

侧栏「系统设置」：`permission: "settings.read"`（`app-sidebar.tsx`）。

## 组件结构

```txt
features/settings/
  components/
    SettingsPage.tsx        # 空态占位（当前无配置项）
```

## API 调用

当前不调用 settings API（空态直接展示）。后端 `GET/PATCH /api/v1/settings` 保留（registry 空：list 返回空，update 任意 key 400），后续新增配置项时前端恢复调用。

## 权限

- `settings.read`：路由 `beforeLoad`（进设置页）+ 侧栏显隐。
- `settings.update`：当前无 UI 消费（无配置项可改），权限保留供后续。
- 前端权限只控 UX；后端 `PermissionChecker` 才是授权边界。

## 与后端对应

- 后端 feature 文档：[`docs/features/backend/system-settings.md`](../backend/system-settings.md)
- 后端 API：`GET /api/v1/settings`、`PATCH /api/v1/settings/{key}`（body `{ value: <json> }`）
- 运行时配置控制决策：[ADR-0007](../../adr/0007-runtime-config-control.md)（含 signUp 退役 superseded 注记）
