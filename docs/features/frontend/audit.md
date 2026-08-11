---
status: Active
owner: frontend
lastReviewedAt: 2026-08-11
---

# 前端审计(操作日志)

## 概述

审计功能前端:全局审计页(`/audit`,表格 + 筛选 + 详情抽屉)+ 可复用时间线组件(嵌业务详情页)+ IAM 用户详情"操作历史" Tab。数据来自 [backend audit feature](../backend/audit.md) 的 3 个端点。

## 范围

- 全局审计页:TanStack Table v9 服务端 offset 分页表格、筛选(actions 多选/结果/操作人名称/时间范围)、手动刷新、行点击详情抽屉(**结构化 diff**)
- `AuditTimeline` 组件:by-resource 时间线(cursor"加载更多"),成功实心点 / 失败红色点;使用最小时间线 DTO 和响应中的 `actionLabel`,不再请求需 `audit.read` 的 action catalog
- user-detail-panel"操作历史" Tab(经 `auditTabContent` prop 注入,feature 间不直接 import)

不做:角色详情页 / 项目详情页时间线 Tab(后续嵌入)、审计导出、自动轮询/实时推送、表格排序(后端无 sort 参数)。

## 路由

- `/_authenticated/audit/`,`beforeLoad` 守卫 `audit.read`。
- **筛选/分页状态全部在 URL search**(`validateSearch` 手写守卫):`page` / `pageSize` / `actions[]` / `status` / `actorKeyword` / `from` / `to` — 刷新/分享/返回键全保留。`actions` 兼容单值与数组输入，守卫负责去空、去重并限制最多 50 项。
- 状态所有权:route 层持有 `useSearch`/`useNavigate`(features 不依赖 routes,类型 `AuditSearch` 在 `features/audit/lib/audit-search.ts`),通过 props 注入表格组件。

## 组件结构

```txt
features/audit/
  components/
    audit-log-table.tsx          # 全局审计页:search 驱动 + 防抖输入 + 行选中 + DataTable 分页/列配置
    audit-log-filters.tsx        # 筛选条(actions 多选 Combobox / 结果 Select / 操作人 InputGroup / DateRangePicker / 条件重置)
    audit-empty-state.tsx        # AuditEmptyState(有筛选无结果 / 首次无数据二分)
    audit-log-detail-sheet.tsx   # 行详情抽屉(操作人名称/IP/requestId/结构化 diff)
    audit-diff-list.tsx          # 结构化 diff:逐字段 旧值→新值,ins/del + sr-only 前缀双通道,_names 名称优先,长值折叠,格式化/原始切换
    audit-timeline.tsx           # 时间线容器(加载更多 + 错误重试)
    audit-timeline-item.tsx      # 单条节点(actor 名称 + Collapsible 展开 diff)
    timeline.tsx                 # 通用 Timeline/TimelineItem 基元(竖线 + 圆点)
  hooks/
    use-audit-logs.ts            # 全局列表 useWatcher(page/pageSize + 筛选含 actorKeyword 变化自动重取)
    use-resource-audit-logs.ts   # 时间线 useWatcher(cursor 作 send 参数,失败可重试)
    use-audit-actions.ts         # action 目录(Infinity 缓存)
  lib/
    format-diff.ts               # Intl 时间(绝对+秒)/资源类型中文化/actor 名称/摘要
    audit-filters.ts             # hasActiveFilters/时间预设(纯函数)
    audit-search.ts              # AuditSearch 类型 + ISO datetime search 校验(route 与 features 共用)

时间范围选择器在 `components/shared/date-range-picker.tsx`(shared 层,不依赖 features):

- 结构依据 shadcn 官方 Calendar/Popover 组合(Base UI 用 render prop):触发按钮 + Popover(预设 ToggleGroup + 响应式 zhCN 日历 + 操作栏),不再叠加内层 Select 或日历边框
- 预设(近 24 小时/7 天/30 天/全部)使用 Popover 顶部紧凑 ToggleGroup;每次打开 Popover 重新解析相对 now,避免长驻页面使用过期边界
- 预设选择立即写 URL;自定义日历在 Popover 内维护草稿,点击「应用」后才一次写入 URL,取消/关闭丢弃草稿
- 桌面双月、`<640px` 单月;无选择时双月展示上月 + 本月,避免渲染整月不可选的未来月份;仅桌面自动聚焦日历;每次打开重新计算禁用未来日期边界
- 文案:预设优先显示预设名;自定义无值「全部时间」/ 仅 from「MM-dd 起」/ 同年「MM-dd ~ MM-dd」/ 跨年带年;边界转换 from 00:00、to 23:59:59.999(与后端 inclusive 语义一致)
```

路由页 `routes/_authenticated/audit/index.tsx` 只做守卫 + search 持有 + props 注入。

## API 调用

- `useAuditLogs`:监听 `[page, pageSize, actionsKey, actorUserId, actorKeyword, status, from, to]`,`cacheFor: 0`(实时性)；数组先归一为稳定字符串依赖，避免因引用变化重复请求
- **URL 同步模式**(筛选/分页):route 层 `navigate({ replace: true, search: (prev) => ... })`(功能性 updater 保留其他参数,非分页变更重置 page,replace 不污染历史)
- **actorKeyword 输入**:本地 state 即时响应 + 250ms 防抖写 URL(受控输入直接绑 search 会卡顿);URL 外部变化(返回键)、重置、清除操作人和卸载都会取消 pending timer
- **URL 日期**:`from/to` 在 route `validateSearch` 中按 `z.iso.datetime()` 校验;`to` 不能脱离有效 `from` 独立存在,非法或非原子范围归一为 `undefined`,不透传给后端
- **时间范围**:`DateRangePicker` 统一出口;预设立即提交,自定义范围点击「应用」后提交;清除始终同时清除 from/to
- **操作类型**:使用 Base UI shadcn 多选 `Combobox`，按中文 label 或 action code 搜索，但列表和触发器不显示机器代码；工具栏触发器按选择数显示「全部操作」/单项名称/「已选 N 项」，搜索框放在弹层内，避免多选项撑高工具栏。一次选择变更只写一次 `actions` URL 状态，并由一个列表请求按 OR 语义筛选；结果和 pageSize 保留 Select
- **统一工具栏**:筛选控件左对齐,刷新/列设置右对齐;异步列表只替换表格 viewport,首次加载和刷新时工具栏保持挂载
- **手动刷新**:直接调用当前 `useAuditLogs.send()`,保留 URL 筛选、分页和列偏好;loading 时按钮 Spinner + disabled
- `useResourceAuditLogs`:监听 `[resourceType, resourceId]`;加载更多/刷新用 `send(cursor)`(cursor 不进 reactive state,失败后再点重试同一页);`onSuccess` 里按请求 cursor 区分替换/append;page 状态带 `resourceKey` 派生展示,条目类型为时间线最小 DTO
- `useAuditActions`:`listAuditActions` 配 `cacheFor: Infinity`(`$$userConfigMap` 集中配置,见 state-cache.md),组件自取,路由 loader 不预取;资源时间线直接使用 `actionLabel`,不重复请求 action catalog
- 分页器:`components/shared/data-table/data-table-pagination.tsx` 组合 `components/ui/pagination.tsx`(shadcn 生成物,勿手改)+ 页容量 Select(25/50/100,进 URL);无数据时仍显示并禁用
- 列配置：`components/shared/data-table/data-table-column-settings.tsx` 使用 DnD Kit 的 Pointer/Keyboard sensor；偏好存于 `hono-openapi-starter:data-table:audit-log:v1`，只保存顺序与显隐

页面布局遵循 [前端 Data Table 约定](../../conventions/frontend/data-table.md)：表体滚动、表头吸顶、分页栏位于 viewport 外常驻。列显隐仅改变 UX，不承担敏感字段保护。

## 权限

- 全局审计页/目录:`audit.read`(路由守卫 + 菜单项 `permission: "audit.read"`)
- 时间线:无需 `audit.read`,后端按资源可见性校验;IAM Tab 依赖用户详情页既有权限

## 与后端对应

| 前端调用 | 后端端点 |
| --- | --- |
| `Apis.Audit.listAuditLogs` | GET `/api/v1/audit-logs`(含 `actions` CSV 多选 OR、`actorName` 写时快照、`actorKeyword` 名称搜索) |
| `Apis.Audit.listAuditLogsByResource` | GET `/api/v1/audit-logs/by-resource`(时间线最小 DTO,含 `actionLabel`) |
| `Apis.Audit.listAuditActions` | GET `/api/v1/audit-logs/actions` |

类型经 `gen:api` 从 OpenAPI 生成(`api/globals.d.ts`);快照使用可递归的 `AuditJsonValue`(字符串/数字/布尔/null/数组/对象),`resourceRefs`/`changedFields` 等为具体类型。diff viewer 不通过 `as` 强转快照,而是在边界运行时窄化对象、数组和 `_names`;测试 `snap()` 仅保留字面量泛型推导,不绕过类型契约。`actions` 在 OpenAPI 中声明为 `style=form, explode=false`，生成客户端按 `actions=a,b` 发送，后端校验层归一为数组。

## 发布兼容性

- 全局审计列表使用完整 `AuditLog`,资源时间线使用最小 `AuditTimelineLog`;时间线的 `actionLabel` 由后端返回,不依赖额外的 action catalog 请求或 `audit.read`。
- 当前 feature 分支没有仓库内可核实的外部 API 发布记录;若实际已有 v1 消费者,不得静默依赖时间线新增/删除字段,应保留旧响应、提供版本化契约或设置 deprecation 窗口。
- 历史 action code 保持稳定;前端展示优先使用服务端 label,无法解析时应保留原始 action code,避免历史记录变成空白。
- 生成 API 的同步窗口必须同时具备可访问的后端 OpenAPI 来源和明确授权；查询契约变化后必须重新执行 `pnpm --filter frontend gen:api`，不得手改生成声明。
