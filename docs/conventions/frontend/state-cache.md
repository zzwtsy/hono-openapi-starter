---
status: Active
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端状态与缓存规范

## 服务端状态:alova cache

服务端状态(API 数据)走 alova cache,不引入状态库。

### cache 模式

alova 有 L1(memory)/L2(persistent)两层。默认 GET 5000ms memory cache。

- 快速页内访问:memory(reset on refresh)
- 离线优先/跨刷新:restore(L2)
- 禁用:`cacheFor: 0`

### 自动失效(hitSource,推荐)

GET 标 `hitSource`,mutation 标 `name`,mutation 后自动失效相关 GET cache。零命令式 `invalidateCache`:

```ts
// 列表 GET
const { data } = useRequest(() => Apis.IAM.listRoles(), {
  cacheFor: 60_000,
});

// 创建 mutation,失效列表
const { send } = useRequest(() => Apis.IAM.createRole({ data: {...} }), {
  hitSource: [() => Apis.IAM.listRoles()],
});
```

### 手动失效(少用)

`invalidateCache` / `setCache` / `queryCache`(异步 await)。

## 客户端状态

客户端状态(UI 状态:表单输入、tab、modal 开关)用 React state(`useState`/`useReducer`)。

**暂不引入状态库**(zustand 等)。若未来全局状态增多,再评估引入。

## 跨组件触发

跨组件刷新数据用 `actionDelegationMiddleware` + `accessAction`(无需 prop-drifting 或全局 store)。见 alova 文档。

## cache 与 loader 协作

关键路由 loader `await method` 写 cache,组件 `useRequest` 命中(见 [routing](./routing.md) loader 预取)。
