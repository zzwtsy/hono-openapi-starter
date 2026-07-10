---
status: Draft
owner: frontend
lastReviewedAt: 2026-07-10
---

# 前端测试规范(待搭建)

> 状态:Draft。前端测试基础设施(vitest + React Testing Library)尚未搭建,本规范为占位,待落地时补全。

## 计划范围

- 单元测试:hooks(`useRequest` 封装)、utils、纯函数
- 组件测试:`features/<feature>/components/` 渲染与交互
- 路由测试:守卫重定向、loader 预取、context 注入
- API mock:alova mock adapter 或 MSW

## 待定

- 测试框架:vitest(与后端一致)
- 组件库:React Testing Library
- mock 策略:alova mock vs MSW
- 覆盖率门禁

落地后参照后端 [testing-strategy](../backend/testing-strategy.md) 风格补全。
