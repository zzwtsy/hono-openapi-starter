---
status: Active
owner: frontend
lastReviewedAt: 2026-08-10
---

# 前端 Data Table 约定

## 技术边界

- 数据模型和表格状态使用 `@tanstack/react-table` v9；共享 feature 在 `src/lib/data-table/table.ts` 注册。
- 视觉层继续使用 `src/components/ui/table.tsx`、`pagination.tsx`、`popover.tsx`、`checkbox.tsx` 等 Base UI shadcn 组件。`components/ui` 是 vendored 生成物，不直接修改。
- `src/components/shared/data-table/` 只提供布局、分页、列设置和偏好持久化基元；业务 feature 负责列定义、数据请求和权限。

## 布局

表格页面必须形成以下高度链：路由页 `overflow-hidden` → feature 根节点 `flex-1 min-h-0` → `DataTableFrame` → `DataTableViewport`。表体在 viewport 内滚动，表头吸顶；`DataTableFooter` 位于 viewport 外并始终渲染，因此加载、空数据和单页时分页位置不跳动。

分页组件在没有数据时也保留，显示总数 0 并禁用页码跳转。服务端分页由 URL 持有 `page/pageSize`；客户端分页由表格组件持有 `PaginationState`。

## 列配置

- 每个持久化列必须有显式稳定 `id`，meta 至少提供 `label`；操作列设置 `configurable: false`，由权限决定是否创建，不能通过 localStorage 恢复出来。
- DnD 只出现在“列设置” Popover：拖拽手柄独立可操作，PointerSensor 使用距离激活，KeyboardSensor 使用方向键；拖拽坐标限制在纵轴，`DragOverlay` Portal 到 `document.body` 以脱离 Popover 定位上下文，避免页面横向溢出；列标签和复选框不会启动拖拽。
- `columnOrder` 与 `columnVisibility` 独立维护。隐藏列仍保留在顺序数组中；新增列追加，未知列和重复列清理，固定尾列始终回到末尾。
- 至少保留一个可见数据字段。恢复默认会清除当前表的偏好。

## 持久化

localStorage key 为 `hono-openapi-starter:data-table:<tableId>:v1`，值只包含：

```json
{"order":["name","description"],"hidden":["description"]}
```

读取 JSON、存储被禁用或配额异常时均回退默认值，不能阻断表格交互。该偏好只影响当前浏览器的显示，不是权限控制或数据脱敏机制。

## 分页边界

- 审计：服务端 offset 分页，TanStack 使用 `manualPagination` + `rowCount/pageCount`，页容量 25/50/100，切换容量回到第 1 页。
- 项目：当前接口仍全量返回，TanStack 使用客户端 `paginatedRowModel`，页容量 10/25/50。它只减少 DOM 渲染，不改变接口传输规模。
- 目前不启用排序、列宽、固定列（除操作列顺序约束）和虚拟滚动；需要时单独评估交互与性能边界。
