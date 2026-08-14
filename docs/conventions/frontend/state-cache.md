---
status: Active
owner: frontend
lastReviewedAt: 2026-08-12
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
// src/api/method-config.ts
export const $$userConfigMap = withConfigType({
  "IAM.listRoles": {
    cacheFor: 60_000,
    hitSource: ["IAM.createRole", "IAM.updateRole", "IAM.deleteRole"],
  },
  "IAM.createRole": { name: "IAM.createRole" },
});

// 组件只消费已配置 method；mutation 命中 hitSource 后删除对应 GET cache。
const { data } = useRequest(() => Apis.IAM.listRoles());
```

### 手动失效(少用)

`invalidateCache` / `setCache` / `queryCache`(异步 await)。

## 客户端状态

客户端 UI 状态(tab、modal 开关等)用 React state(`useState`/`useReducer`)；表单输入、校验和提交状态统一用 TanStack Form，见 [forms-tanstack](./forms-tanstack.md)。

**暂不引入状态库**(zustand 等)。若未来全局状态增多,再评估引入。

## 跨组件触发

跨组件刷新数据用 `actionDelegationMiddleware` + `accessAction`(无需 prop-drifting 或全局 store)。

**关键**:alova `hitSource` 只**删缓存**,不重拉已挂载的 `useRequest`(源码 `hitCacheBySource` 仅 `cacheAdapter.remove`,无通知逻辑)。mutation 后要让列表 UI 更新,必须显式触发 send。同组件可直接 `send()`(见 ProjectList);跨组件用 action delegation:

```ts
// 列表组件:注册 action
const { data } = useRequest(() => Apis.IAM.listRoles(), {
  middleware: actionDelegationMiddleware("iam-roles-list"),
});

// 任意组件 mutation 后:触发已注册的 useRequest send(第三参 true 静默未挂载,如非当前 tab)
accessAction("iam-roles-list", (a) => { void a.send(); }, true);
```

IAM 内部 action 名集中常量 + `refreshIam(...names)` 封装见 `features/iam/lib/iam-actions.ts`；跨 feature 共用的 action key 放在 `src/lib/action-keys.ts`，避免账户等 feature 反向依赖 IAM。

## cache 与 loader 协作

关键路由 loader `await method` 写 cache,组件 `useRequest` 命中(见 [routing](./routing.md) loader 预取)。

`method-config.ts` 中的显式 `cacheFor` 覆盖默认 5s，使预取与 back-nav 真正命中：

- `_authenticated` beforeLoad 的 `getMe()` 使用集中配置的 5 分钟缓存，跨受保护页面不重拉 `/me`（permissionCodes stale 由后端兜底）。
- 列表 loader `listRoles()` 写入集中配置的 60 秒缓存，组件 `useRequest(() => listRoles())` 命中同一 cache key，不重复声明策略。

未来引入 mutation(增删改)时,GET 标 `hitSource` 失效相关 cache(零命令式 `invalidateCache`)。
