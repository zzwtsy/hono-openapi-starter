# Agent 工作指南

## 工作循环

1. 先读地图：从 `README.md`、`docs/README.md` 和本文件确认项目目标、文档路由、架构边界和质量门禁。
2. 再查事实：用 `rg` 或 `find` 定位当前文档、源码、测试和配置，不用旧文档替代当前事实。
3. 明确意图：小改动可以直接执行；跨阶段、跨模块或高风险工作应先维护执行计划。
4. 编码约束：复用已有规范和模板，优先让规则沉淀到测试、脚本、文档路由或 agent 手册。
5. 验证闭环：按改动范围运行最小可证明的检查，并在文档中记录无法验证的原因。
6. 清理熵增：发现过期文档、废弃计划、重复规则或源码噪声时，随任务一并收敛。

## 文档路由

- `README.md`：repo 入口，只放稳定入口、推荐阅读顺序和关键文档链接。
- `docs/README.md`：文档地图，按任务指向应该阅读和维护的文档。
- `docs/architecture/`：当前架构事实（`overview` 整体 + `backend`/`frontend` 目录边界、请求生命周期和禁止模式）。
- `docs/conventions/`：执行规范（`shared` 项目级 + `backend` + `frontend`）。
- `docs/features/`：feature 设计模板和具体 feature 文档（`backend`/`frontend`）。
- `docs/packages/`：`packages/*` 共享包文档（自定义 eslint 规则、共享依赖）。
- `docs/adr/`：已经接受的长期架构决策；只记录决策历史，不能当作当前实现的唯一事实。
- `docs/diagrams/`：Mermaid 图，必须和对应 architecture 或 feature 文档保持一致。
- `docs/checklists/`：安全、可观测性等验收清单。

## 推荐阅读顺序

处理架构、开发流程、长期维护或文档治理任务时，按下面顺序读取：

1. `README.md`
2. `docs/README.md`
3. `docs/architecture/overview.md`
4. `docs/architecture/backend/directory-structure.md`（后端任务）或 `docs/architecture/frontend/directory-structure.md`（前端任务）
5. `docs/adr/README.md`，再读相关 `docs/adr/*.md`
6. 与任务直接相关的 `docs/conventions/{shared,backend,frontend}/*.md`
7. 涉及 feature 时读 `docs/features/{backend,frontend}/_template.md`
8. 涉及验收时读相关 `docs/checklists/*.md`

读完文档后必须回到当前事实：用 `rg` 或 `find` 定位实际实现、测试、配置和现有文档，确认文档没有脱离当前状态。

## 禁止行为

- 不要无差别通读整个 `docs/` 后才开始工作；先按任务路由读取，再深入相关文档。
- 不要把历史 ADR 当成当前实现事实；ADR 只说明为什么做过某个长期决策。
- 不要在 Markdown 中手写完整 API schema 来替代 `createRoute` 和 OpenAPI 源码契约。
- 不要直接删除 `Active` 文档；必须先标记废弃或归档，并说明替代关系。
- 不要删除 ADR；被替代时新增 ADR，并在旧 ADR 中标记 superseded。
