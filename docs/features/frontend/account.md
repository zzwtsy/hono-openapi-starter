---
status: Active
owner: frontend
lastReviewedAt: 2026-08-14
---

# 前端账户自助

## 概述

账户自助页让登录用户修改自己的显示名(name)、密码(password)，并查看授权来源，无需管理员介入。走自建业务端点(统一 envelope),不引 BA admin 插件(延续 ADR-0007)。email 修改暂不支持(需邮件基础设施,见后端 iam.md §3 Non-goals)。

## 范围

- 包含:修改显示名、修改密码(验当前密码 + 删全部 session 强制重登)、查看 Home org/祖先组织授权与有效权限来源。
- 不包含:修改 email、修改 orgId/disabled、找回密码(走管理员代重置)。

## 路由

| 路径 | 守卫 | loader | 组件 |
| --- | --- | --- | --- |
| `/account` | 认证(`_authenticated` 层) | - | `AccountPage` |

仅需认证,无 `requirePermission`——所有登录用户可访问(看自己/改自己)。入口在侧栏底部 `NavUser` 下拉菜单"账户设置"。

## 组件结构

```txt
features/account/
  components/
    account-page.tsx           # Tabs:资料 / 密码 / 授权
    authorization-panel.tsx    # 自查原始授权与有效权限来源
    profile-form.tsx           # 改显示名(TanStack Form + zod);成功后 router.invalidate()
    change-password-form.tsx   # 改密码(当前密码 + 新密码 + 确认);成功后 signOut + 跳 /login
```

## 交互

### 修改显示名

- 表单:`ProfileForm`,遵循 [TanStack Form 规范](../../conventions/frontend/forms-tanstack.md)，失焦 + 提交时用 zod 校验(`name` min 1)。
- 成功后:`Apis.Me.updateMe` → `toast.success` → `router.invalidate()` 重跑 `_authenticated.beforeLoad`(失效 `Me.getMe` 缓存后重拉)→ sidebar 等依赖 `context.auth.user.name` 的组件自动刷新。
- 不删 session:改 name 不是安全敏感操作,无需强制下线。

### 修改密码

- 表单:`ChangePasswordForm`,遵循 [TanStack Form 规范](../../conventions/frontend/forms-tanstack.md)，失焦 + 提交时用 zod 校验(`currentPassword` required、`newPassword` min 8、`confirmPassword` 必须匹配 `newPassword`)。
- 成功后:后端删全部 session → `toast.success("密码已修改,请重新登录")` → `signOut()` → `router.navigate({ to: "/login" })`。当前 session 已失效,必须重新登录。
- 当前密码错误:后端返回 `USER_INVALID_PASSWORD`(401),toast 展示错误消息。

### 查看授权来源

- 「授权」Tab 调用 `Apis.IAM.getMyAuthorization()`，只需认证，不要求 `assignments.read`。
- 页面展示当前 Home org、祖先组织的原始角色/直接授权(包含 deny 与过期)以及 Home org 的有效权限来源链；不接受用户或组织参数，因此不能查看他人授权。
- 授权变更通过 alova `hitSource` 失效当前数据；已挂载的面板用 action delegation 自动重拉。

## API 与缓存

| 操作 | API | 说明 |
| --- | --- | --- |
| 改显示名 | `Apis.Me.updateMe({ data: { name } })` | hitSource 失效 `Me.getMe` + `IAM.listUsers` |
| 改密码 | `Apis.Me.changeMyPassword({ data: { currentPassword, newPassword } })` | 改密码后 session 全删,前端 signOut |
| 查看授权 | `Apis.IAM.getMyAuthorization()` | 仅认证；返回自己的原始授权与有效权限来源 |

`api/method-config.ts` 缓存配置：`Me.getMe` 和 `IAM.listUsers` 的 hitSource 均含 `Me.updateMe`（改 name 后两处缓存都失效）。

## 权限

无权限要求。`/account` 路由仅需认证,侧栏 `NavUser` 下拉对所有登录用户显示"账户设置"入口。

## 与后端对应

- 后端 feature 文档:[`docs/features/backend/iam.md`](../backend/iam.md)(§4 API Surface 含 `/api/v1/me` 端点)
- 后端 API:`PATCH /api/v1/me`、`POST /api/v1/me/password`、`GET /api/v1/me/authorization`(仅需认证)
- 自建端点决策:[ADR-0007](../../adr/0007-runtime-config-control.md)(用户管理走自建端点)
