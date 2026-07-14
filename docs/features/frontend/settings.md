---
status: Draft
owner: frontend
lastReviewedAt: 2026-07-15
---

# 前端系统设置

## 概述

系统设置页提供运行时可编辑配置的管理界面。本期只含一项配置:是否开启用户注册。管理员通过开关切换注册状态,无需改 env 重启。

## 范围

- 包含:配置列表展示、配置编辑(本期:注册开关)。
- 不包含:配置变更审计日志、配置变更通知。

## 路由

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/settings` | `requirePermission("settings.read")` | `listSettings` | `SettingsPage` |

## 组件结构

```txt
features/settings/
  components/
    SettingsPage.tsx        # 配置列表 + 编辑(本期:注册开关)
```

## API 调用

- 列表:`useRequest(() => Apis.Settings.listSettings())`,loader 预取缓存命中。
- 编辑:`Apis.Settings.updateSetting({ pathParams: { key: "signUp" }, data: { enabled: !current } })`。

## 权限

- `settings.read`:路由 `beforeLoad`(进设置页)。
- `settings.update`:编辑配置入口(开关 disabled 态)。
- 前端权限只控 UX;后端 `PermissionChecker` 才是授权边界。

## 与后端对应

- 后端 feature 文档:[`docs/features/backend/system-settings.md`](../backend/system-settings.md)
- 后端 API:`GET /api/v1/settings`、`PATCH /api/v1/settings/{key}`
- 运行时配置控制决策:[ADR-0007](../../adr/0007-runtime-config-control.md)
