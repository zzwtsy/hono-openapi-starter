---
status: Accepted
date: 2026-07-10
---

# ADR-0005:前端 API 生成工具选型(@alova/wormhole)

## 背景

前端用 alova 做请求层,需从后端 OpenAPI 自动生成类型安全 API。候选:

- `@alova/wormhole`(alova 官方)
- `worma`(npm 包 `wormajs`,新工具)

## 决策

选 **`@alova/wormhole`**。

## 理由

- worma(npm 包 `wormajs`)实际是 2026-07-05 发布的 **0.0.1** 早期版,5 天前刚发布,未经生产验证,API 可能 breaking change。
- `@alova/wormhole` 1.5.2(latest),2024-11 起,alova 官方成熟工具。
- production-grade starter 优先稳定性,0.0.1 风险过高。
- worma 的按需引入 + tree-shaking 设计虽更现代,但 wormhole 的全局 `Apis` + feature 按需封装已满足需求(见 [frontend/api-alova](../conventions/frontend/api-alova.md))。

## 代价

- wormhole 全局 `Apis` 模式(非 worma 按需引入),tree-shaking 稍弱。但 feature 按需封装 + 直接用 `Apis` 可接受。

## 后续

worma 成熟后(稳定版 + 生产案例),可重新评估迁移(worma skill 提供迁移路径)。
