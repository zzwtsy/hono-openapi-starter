---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# ADR-0001: 使用 features 垂直切片架构

## Status

Accepted

## Context

传统 `routes / services / repositories / schemas` 横向分层在中大型项目中容易导致业务代码分散，feature 边界模糊，共享层持续膨胀。

## Decision

所有业务代码默认放在：

```txt
src/features/<feature>
```

简单 feature 允许单文件平铺，复杂 feature 可以进一步拆分为：

```txt
api/
application/
domain/
infrastructure/
lib/
```

## Consequences

优点：

- 业务边界清晰。
- feature 更容易迁移和测试。
- 降低共享层耦合。
- 更适合中大型项目演进。

代价：

- 小项目会多一些文件。
- 部分 schema/service/repository 命名会有重复。
- 需要 lint 约束 feature 边界。
