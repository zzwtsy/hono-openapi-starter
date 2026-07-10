---
status: Active
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端 API 调用规范(alova + wormhole)

## 核心原则

- **API 调用用 alova**(非 TanStack Query)。
- **API 函数由 @alova/wormhole 从后端 OpenAPI 自动生成**(`Apis`),类型安全,不手写。
- **组件用 alova hook 直传 Apis method;非组件直接 await method**。
- **封装按需**:`api.ts`/`hooks.ts` 必须注入价值,否则直接用 `Apis`。

## 何时用 alova hook vs 直接 await method

| 场景 | 用法 |
| --- | --- |
| 组件渲染取数(需 loading/data/error reactive + cache) | `useRequest(() => Apis.IAM.listRoles())` |
| 响应式变化自动重取(搜索/筛选/分页) | `useWatcher` |
| 分页列表 | `usePagination` |
| 表单提交 | `useForm` |
| loader / beforeLoad 预取 | `await Apis.IAM.listRoles()`(写 cache) |
| 事件回调 / 工具函数 | `await Apis.IAM.createRole({ data: {...} })` |

判断标准:**结果要驱动渲染** -> hook;**不驱动渲染**(预取/事件/工具)-> 直接 await method。

## 用 hook 时直接传 Apis method

```ts
// ✅ 直接传 Apis 生成的 method
const { data, loading, error } = useRequest(() => Apis.IAM.listRoles());
```

hook 的策略(`cacheFor`/`transform`/`hitSource`)在 `useRequest` 第二参数 config,不在 method 封装:

```ts
useRequest(() => Apis.IAM.listRoles(), {
  cacheFor: 60_000,
  transform: data => data.filter(r => r.source === "instance"),
});
```

## 按需封装(强制规范)

### `hooks.ts` 封装条件

**只在多组件复用同一请求 + 同一策略时**封装:

```ts
// ✅ 多组件都要 roles 列表 + 同样的缓存/transform -> 封装复用
function useRoles() {
  return useRequest(() => Apis.IAM.listRoles(), { cacheFor: 60_000, transform: ... });
}
```

单组件用、无共享策略:**不封装**,组件内直接 `useRequest(() => Apis.IAM.listRoles())`。

### `api.ts` 封装条件

**只在业务语义封装有价值时**(参数转换/聚合/默认值/校验):

```ts
// ✅ 隐藏 alova {data} 结构,暴露业务语义
export const iamApi = {
  createRole: (name: string, description?: string) =>
    Apis.IAM.createRole({ data: { name, description } }),
};
```

无参查询、无参数转换:**不封装**,直接 `Apis.IAM.listRoles()`。

### 禁止:薄透传封装

```ts
// ❌ 薄透传,没注入任何价值
listRoles: () => Apis.IAM.listRoles(),
useRoles = () => useRequest(() => iamApi.listRoles());
```

用 wormhole 生成后,`Apis` 已是集中存储 + 类型安全的请求函数。alova 官方"集中请求函数"建议针对**手动**场景;**生成场景下 `Apis` 已满足**,不需要再"集中"。

## envelope 处理(两端剥离)

后端业务 API 强制 envelope `{ success, code, message, data, error, meta }`(见 [backend/response-envelope](../backend/response-envelope.md))。前端两端剥离,使生成类型 = data 类型,运行时也返回 data:

- **类型剥离**:`alova.config.ts` 的 `handleApi` 把 `apiDescriptor.responses` 改为 `properties.data`。
- **运行时剥离**:`src/api/index.ts` 的 `responded.onSuccess` 检 `!json.success` 抛错、`return json.data`。

两端一致:生成类型 = data 类型,运行时返回 data。

## 非 envelope 端点(meta.raw)

后端规范:业务 API 必须 envelope;Better Auth `/api/auth/*` 例外(前端走 Better Auth client,不经 alova)。未来若有非 envelope 业务端点走 alova(文件下载/SSE/二进制),用 `meta.raw` 标记跳过剥离:

```ts
// src/api/index.ts
declare module "alova" {
  interface AlovaCustomTypes {
    meta: { raw?: boolean };
  }
}

responded: {
  onSuccess: async (res, method) => {
    if (method.meta?.raw === true) return res; // 非 envelope,返回原始 Response
    const json = (await res.json()) as ApiResponse;
    if (!json.success) throw new Error(json.message || "请求失败");
    return json.data;
  };
}

// 调用:文件下载
alovaInstance.Get("/api/v1/export", { meta: { raw: true } });
```

## wormhole 生成工作流

- 配置:`apps/frontend/alova.config.ts`,`input` 后端 `http://localhost:3001/openapi.json`,`handleApi` 剥 envelope 类型。
- 生成:`pnpm --filter frontend gen:api`(需后端 dev 运行)。
- 产物:`src/api/{index.ts(可编辑), createApis.ts, apiDefinitions.ts, globals.d.ts}`。
- **生成物入 git**(克隆即用,CI 不依赖后端 dev);`createApis.ts`/`apiDefinitions.ts` eslint ignore(不 lint 生成代码)。
- `index.ts` 生成时不覆盖,放 alova 实例定制(envelope 剥离 + meta.raw + statesHook)。
- 后端 spec 变更:重新 `gen:api`(或 VSCode 扩展 autoUpdate)同步前端 API。
