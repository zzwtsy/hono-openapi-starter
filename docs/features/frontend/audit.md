---
status: Active
owner: frontend
lastReviewedAt: 2026-08-01
---

# 前端审计(操作日志)

## 概述

审计功能前端:全局审计页(`/audit`,表格 + 筛选 + 详情抽屉)+ 可复用时间线组件(嵌业务详情页)+ IAM 用户详情"操作历史" Tab。数据来自 [backend audit feature](../backend/audit.md) 的 3 个端点。

## 范围

- 全局审计页:offset 分页表格、筛选(action/结果/操作人名称/时间范围)、active chips、行点击详情抽屉(**结构化 diff**)
- `AuditTimeline` 组件:by-resource 时间线(cursor"加载更多"),成功实心点 / 失败红色点
- user-detail-panel"操作历史" Tab(经 `auditTabContent` prop 注入,feature 间不直接 import)

不做:角色详情页 / 项目详情页时间线 Tab(后续嵌入)、审计导出、实时刷新、表格排序(后端无 sort 参数)。

## 路由

- `/_authenticated/audit/`,`beforeLoad` 守卫 `audit.read`。
- **筛选/分页状态全部在 URL search**(`validateSearch` 手写守卫):`page` / `pageSize` / `action` / `status` / `actorKeyword` / `from` / `to` — 刷新/分享/返回键全保留。
- 状态所有权:route 层持有 `useSearch`/`useNavigate`(features 不依赖 routes,类型 `AuditSearch` 在 `features/audit/lib/audit-search.ts`),通过 props 注入表格组件。

## 组件结构

```txt
features/audit/
  components/
    audit-log-table.tsx          # 全局审计页:search 驱动 + 防抖输入 + 行选中 + 分页器组合
    audit-log-filters.tsx        # 筛选条(action Select / 结果 Select / 操作人输入 / DateRangePicker / 重置)纯展示
    audit-filter-chips.tsx       # FilterChipsRow(可移除 chip + 清除全部 + 结果计数 + aria-live)+ AuditEmptyState(空态二分)
    audit-log-detail-sheet.tsx   # 行详情抽屉(操作人名称/IP/requestId/结构化 diff)
    audit-diff-list.tsx          # 结构化 diff:逐字段 旧值→新值,ins/del + sr-only 前缀双通道,_names 名称优先,长值折叠,格式化/原始切换
    audit-timeline.tsx           # 时间线容器(加载更多 + 错误重试)
    audit-timeline-item.tsx      # 单条节点(actor 名称 + Collapsible 展开 diff)
    timeline.tsx                 # 通用 Timeline/TimelineItem 基元(竖线 + 圆点)
  hooks/
    use-audit-logs.ts            # 全局列表 useWatcher(page + 筛选含 actorKeyword 变化自动重取)
    use-resource-audit-logs.ts   # 时间线 useWatcher(cursor 作 send 参数,失败可重试)
    use-audit-actions.ts         # action 目录(Infinity 缓存)
  lib/
    format-diff.ts               # Intl 时间(绝对+秒)/资源类型中文化/actor 名称/摘要
    audit-filters.ts             # chips 派生/hasActiveFilters/时间预设(纯函数)
    audit-search.ts              # AuditSearch 类型(route 与 features 共用)

时间范围选择器在 `components/shared/date-range-picker.tsx`(shared 层,不依赖 features):

- 结构依据 shadcn 官方示例 `date-picker-with-range`/`date-picker-with-presets`(new-york-v4 源,base-nova 无 asChild 用 render prop):触发按钮 + Popover(预设 Select + 双月 zhCN 日历)
- 预设(近 24 小时/7 天/30 天/全部)为 Popover 内嵌 Select,非筛选条按钮组;预设 from 由调用方 memo 一次(重渲染 now 漂移会失配选中态)
- 受控绑定 URL search(无本地 state);日历 `key` 随 from 变化 remount,预设点击后默认月跳到对应月
- 文案:无值「全部时间」/ 仅 from「MM-dd 起」/ 同年「MM-dd ~ MM-dd」/ 跨年带年;边界转换 from 00:00、to 23:59:59.999(与后端 inclusive 语义一致)
```

路由页 `routes/_authenticated/audit/index.tsx` 只做守卫 + search 持有 + props 注入。

## API 调用

- `useAuditLogs`:监听 `[page, action, actorUserId, actorKeyword, status, from, to]`,`cacheFor: 0`(实时性)
- **URL 同步模式**(筛选/分页):route 层 `navigate({ replace: true, search: (prev) => ... })`(功能性 updater 保留其他参数,非分页变更重置 page,replace 不污染历史)
- **actorKeyword 输入**:本地 state 即时响应 + 250ms 防抖写 URL(受控输入直接绑 search 会卡顿);URL 外部变化(返回键)回同步输入并取消 pending timer
- **时间范围**:`DateRangePicker` 统一出口(预设 Select / 双月日历 / 清除),选择即写 URL;action/status/pageSize Select 均传 `items` prop 使 Value 按 label 渲染(Base UI 与 Radix 差异,shadcn #9753)
- `useResourceAuditLogs`:监听 `[resourceType, resourceId]`;加载更多/刷新用 `send(cursor)`(cursor 不进 reactive state,失败后再点重试同一页);`onSuccess` 里按请求 cursor 区分替换/append;page 状态带 `resourceKey` 派生展示
- `useAuditActions`:`listAuditActions` 配 `cacheFor: Infinity`(`$$userConfigMap` 集中配置,见 state-cache.md),组件自取,路由 loader 不预取
- 分页器:`components/ui/pagination.tsx`(shadcn 生成物,勿手改)+ 页容量 Select(25/50/100,进 URL)

## 权限

- 全局审计页/目录:`audit.read`(路由守卫 + 菜单项 `permission: "audit.read"`)
- 时间线:无需 `audit.read`,后端按资源可见性校验;IAM Tab 依赖用户详情页既有权限

## 与后端对应

| 前端调用 | 后端端点 |
| --- | --- |
| `Apis.Audit.listAuditLogs` | GET `/api/v1/audit-logs`(含 `actorName` 写时快照、`actorKeyword` 名称搜索) |
| `Apis.Audit.listAuditLogsByResource` | GET `/api/v1/audit-logs/by-resource` |
| `Apis.Audit.listAuditActions` | GET `/api/v1/audit-logs/actions` |

类型经 `gen:api` 从 OpenAPI 生成(`api/globals.d.ts`),`resourceRefs`/`changedFields` 等为具体类型,禁止本地 `as` 强转(测试 fixture 例外,`snap()` helper 注明原因)。
