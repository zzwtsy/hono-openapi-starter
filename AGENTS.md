# Agent 工作指南

全栈模板:后端 Hono + Drizzle + Better Auth + @hono/zod-openapi;前端 React + TanStack Router + alova + @alova/wormhole + Base UI(shadcn)。

## 工作循环

1. 先读地图:从 `README.md`、`docs/README.md` 和本文件确认项目目标、文档路由、架构边界和质量门禁。
2. 再查事实:用 `rg`/`find` 定位本地文档、源码、测试和配置;涉及外部库版本、API 或最佳实践时联网查官方源核对,不凭记忆推测。
3. 明确意图:小改动可以直接执行;跨阶段、跨模块或高风险工作应先维护执行计划。
4. 编码约束:复用已有规范和模板,优先让规则沉淀到测试、脚本、技能、文档路由或 agent 手册。
5. 验证闭环:按改动范围运行最小可证明的检查,并在文档中记录无法验证的原因。
6. 清理熵增:发现过期文档、废弃计划、重复规则或源码噪声时,随任务一并收敛。

## 常用命令

根目录无聚合 script,按 package filter 跑;完整 scripts 见各 `package.json`。

| 操作 | 命令 |
| --- | --- |
| 后端 typecheck | `pnpm --filter backend typecheck` |
| 前端 typecheck | `pnpm --filter frontend typecheck` |
| lint | `pnpm lint`(根) |
| 后端单元测试 | `pnpm --filter backend test` |
| 后端集成测试 | `pnpm --filter backend test:integration`(需 Docker) |
| 后端 build | `pnpm --filter backend build` |
| 前端 build | `pnpm --filter frontend build` |
| 前端生成 API | `pnpm --filter frontend gen:api` |

集成测试用 testcontainers,需 Docker daemon 运行;默认 `pnpm --filter backend test` 只跑单元测试。

## 文档路由

| 目录 | 职责 |
| --- | --- |
| `README.md` | repo 入口,稳定链接和推荐阅读顺序 |
| `docs/README.md` | 文档地图,按任务指向该读哪些文档 |
| `docs/architecture/` | 当前架构事实(整体 + backend/frontend 目录边界、请求生命周期、禁止模式) |
| `docs/conventions/` | 执行规范(shared 项目级 + backend + frontend) |
| `docs/features/` | feature 设计模板和具体 feature 文档 |
| `docs/packages/` | `packages/*` 共享包文档 |
| `docs/adr/` | 已接受的长期架构决策;只记录决策历史,非当前实现唯一事实 |
| `docs/diagrams/` | Mermaid 图,须与对应 architecture 或 feature 文档一致 |
| `docs/checklists/` | 安全、可观测性等验收清单 |

按任务读哪些文档见 [docs/README.md](docs/README.md) 的"按任务阅读"表;通用顺序:README -> docs/README -> 本文件 -> architecture/overview -> 相关 adr -> 相关 conventions。读完文档后必须回到当前事实:用 `rg`/`find` 核对实际实现,确认文档没脱离真实状态。

## 技能

技能按 description 自动触发、按需加载,不占首屏。复用优先:遇到重复工作流先看已有技能(如 `execution-plan`、`feature-pr`)是否覆盖。目录维护规范(内容源、符号链接、vendored vs 自定义、新增命令)见 [.agents/skills/README.md](.agents/skills/README.md)。

## 禁止行为

- 不要无差别通读整个 `docs/` 后才开始工作;先按任务路由读取,再深入相关文档。
- 不要把历史 ADR 当成当前实现事实;ADR 只说明为什么做过某个长期决策。
- 不要在 Markdown 中手写完整 API schema 来替代 `createRoute` 和 OpenAPI 源契约。
- 不要直接删除 `Active` 文档;必须先标记废弃或归档,并说明替代关系。
- 不要删除 ADR;被替代时新增 ADR,并在旧 ADR 中标记 superseded。
- 不要因用户倾向或文档措辞就附和;基于事实给真实判断,含对用户方案和文档的质疑。
