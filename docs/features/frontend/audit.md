---
status: Active
owner: frontend
lastReviewedAt: 2026-08-01
---

# 前端审计(操作日志)

## 概述

审计功能前端:全局审计页(`/audit`,表格 + 筛选 + 详情抽屉)+ 可复用时间线组件(嵌业务详情页)+ IAM 用户详情"操作历史" Tab。数据来自 [backend audit feature](../backend/audit.md) 的 3 个端点。

## 范围

- 全局审计页:offset 分页表格、筛选(action/结果/操作人/时间范围)、行点击详情抽屉(before/after 快照)
- `AuditTimeline` 组件:by-resource 时间线(cursor"加载更多"),成功实心点 / 失败红色点
- user-detail-panel"操作历史" Tab(经 `auditTabContent` prop 注入,feature 间不直接 import)

不做:角色详情页 / 项目详情页时间线 Tab(后续嵌入)、审计导出、实时刷新。

## 路由

- `/_authenticated/audit/`(nav 系统组"操作日志"入口),`beforeLoad` 用 `requirePermission(context.auth.permissions, "audit.read")` 守卫。

## 组件结构

```txt
features/audit/
  components/
    audit-log-table.tsx          # 全局审计页:表格 + 分页 + 筛选状态 + 行键盘可达
    audit-log-filters.tsx        # 筛选条(action Select 来自目录 / 结果 / 日期范围 / 操作人 ID)
    audit-log-detail-sheet.tsx   # 行详情抽屉(操作人/资源/变更字段/IP/requestId/快照 JSON)
    audit-timeline.tsx           # 时间线容器(加载更多 + 错误重试)
    audit-timeline-item.tsx      # 单条节点(Collapsible 展开详情)
    timeline.tsx                 # 通用 Timeline/TimelineItem 基元(竖线 + 圆点)
  hooks/
    use-audit-logs.ts            # 全局列表 useWatcher(page + 筛选变化自动重取)
    use-resource-audit-logs.ts   # 时间线 useWatcher(cursor 作 send 参数,失败可重试)
    use-audit-actions.ts         # action 目录(Infinity 缓存)
  lib/
    format-diff.ts               # 摘要/时间/label 查表/资源引用格式化
```

路由页 `routes/_authenticated/audit/index.tsx` 只做守卫 + PageHeader + 表格组装。

## API 调用

- `useAuditLogs`:监听 `[page, action, actorUserId, status, from, to]`,`cacheFor: 0`(实时性);日期筛选在表格层转 ISO(from 当天 00:00,to 当天 23:59:59.999)
- `useResourceAuditLogs`:监听 `[resourceType, resourceId]`(变化自动重取首页);加载更多/刷新用 `send(cursor)`(cursor 不进 reactive state,失败后再点重试同一页);`onSuccess` 里按请求 cursor 区分替换/append,过期响应丢弃;page 状态带 `resourceKey` 派生展示
- `useAuditActions`:`listAuditActions` 配 `cacheFor: Infinity`(`$$userConfigMap` 集中配置,见 state-cache.md),组件自取,路由 loader 不预取(方法实例缓存不共享)

## 权限

- 全局审计页/目录:`audit.read`(路由守卫 + 菜单项 `permission: "audit.read"`)
- 时间线:无需 `audit.read`,后端按资源可见性校验(有对应业务读权限即可);IAM Tab 依赖用户详情页既有权限

## 与后端对应

| 前端调用 | 后端端点 |
| --- | --- |
| `Apis.Audit.listAuditLogs` | GET `/api/v1/audit-logs` |
| `Apis.Audit.listAuditLogsByResource` | GET `/api/v1/audit-logs/by-resource` |
| `Apis.Audit.listAuditActions` | GET `/api/v1/audit-logs/actions` |

类型经 `gen:api` 从 OpenAPI 生成(`api/globals.d.ts`),`resourceRefs`/`changedFields` 等为具体类型,禁止本地 `as` 强转。
