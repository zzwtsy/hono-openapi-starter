---
name: execution-plan
description: 为跨阶段、跨模块或高风险改动起草执行计划。当用户说"写计划/写执行计划/规划/拆解实现/写落地方案/写下修复计划"或要开始一个多步骤、跨 feature 的改动时触发。小改动（单文件、改个 bug）不触发。把项目里已重复 17+ 次的计划模板固化下来，避免每次重新拼结构。
---

# 执行计划起草

本 skill 把 `.claude/plans/` 里已存在 18 份计划（2026-07-04 起）的共同结构固化成模板。
[AGENTS.md](../../../AGENTS.md) 要求"跨阶段、跨模块或高风险工作应先维护执行计划"，但没给模板——本 skill 补上。

## 何时用 / 何时不用

- **用**：跨 feature、跨 core/db、引入新依赖、改 schema/migration、改架构边界、多步骤重构、审查后落修复方案。
- **不用**：单文件小改、改注释、改文案、一个明确 bug 的直接修复——直接动手，别为小改动写计划。

## 计划文件放哪

- 路径：`.claude/plans/<kebab-name>.md`。
- 注意漂移：[docs/conventions/shared/documentation-system.md](../../../docs/conventions/shared/documentation-system.md) 写的是 `docs/plans/`，但实际 18 份计划都在 `.claude/plans/`。**沿用 `.claude/plans/`**，别放 `docs/plans/`。这是待收敛的文档熵增，不在本 skill 范围。

## 模板（从 18 份计划蒸馏）

```markdown
---
status: draft
owner: backend-platform | frontend | platform
related: docs/conventions/xxx.md, docs/architecture/xxx.md, docs/adr/000N-xxx.md
---

# <主题>（多阶段序列时写 `# 计划 N：<主题>`）

## 范围 / 目标

一句话说本次改什么、为什么。紧跟一个"**不碰**（留后续，坚决不超前）"子列表，显式排除会越界的东西——这是防范围蔓延的关键。

## 设计（基于 X，非推测）

- 引用 ADR / convention / 当前源码作为依据，标题保留"基于 X，非推测"签名，提醒自己别脑补。
- 多决策时用表格（决策 / 结论 / 理由）。
- schema / API 变更用表格列字段。

## 文件变更

分"新增 / 修改"两组，每个文件一行 bullet 说改什么。新增依赖时加"## 依赖（catalog 新增）"表格（包 / 版本 / 用途），走 `pnpm add --save-catalog`。

## 步骤

1. ...（编号，可按阶段拆 1 2 3）

## 验证（最小可证明闭环）

列必须全绿的具体命令（见下"验证门禁链"）。这是计划里最重要的一节——没验证闭环的计划不算完成。

## 不在范围 / 不验证（留后续）

显式列出本次不做、留后续的事，每条说为什么留。

## 风险与应对 / 依赖 / 权衡（可选）

风险与应对成对写；依赖指其它计划编号。
```

## 验证门禁链（source-aware，填进"## 验证"）

当前实际 scripts（[apps/backend/package.json](../../../apps/backend/package.json)、[apps/frontend/package.json](../../../apps/frontend/package.json)、根 [package.json](../../../package.json)）：

- **后端**：`pnpm --filter backend typecheck` → `pnpm lint`（根） → `pnpm --filter backend test`（unit，默认无需 Docker） → `pnpm --filter backend test:integration`（**需 Docker**，testcontainers 起 PG） → `pnpm --filter backend build`
- **前端**：`pnpm --filter frontend typecheck` → `pnpm lint` → `pnpm --filter frontend build`
- **全量**：`pnpm --filter backend test:all`（unit + integration）

注意：

- 根目录**没有** `verify` / `typecheck` / `test` 聚合脚本，必须按 package filter 跑。
- filter 旗标历史漂移过（`-F` → `-C` → `--filter`），现在统一用 `--filter`。
- integration 测试需要 Docker daemon 在跑；没 Docker 时只跑 unit，并在计划里标注 integration 待补。

## 工作流

1. **读地图**：按 [AGENTS.md](../../../AGENTS.md) 推荐顺序读 `docs/README.md` → 相关 architecture/convention/ADR。
2. **查事实**：用 `rg` / `find` 核对当前源码、schema、测试、配置——"基于 X，非推测"，别拿旧文档当事实。
3. **起草**：用上面模板写 `.claude/plans/<name>.md`。`related` 填真正相关的文档路径。
4. **镜像到 TodoWrite**：把步骤/阶段映成 todo，**结尾永远保留两条**：一条"文档同步"、一条"验证（门禁全绿）"。验证 todo 只有在所有门禁通过后才标完成。这是 18 份计划的实际工作方式。
5. **实现 → 验证 → 文档同步**：逐阶段做，每阶段跑相关门禁；最后跑完整门禁链；同步文档。

## 文档同步（收口步骤）

按 [docs/README.md](../../../docs/README.md) 路由决定改哪份文档：

- 改了规范/约定 → `docs/conventions/{shared,backend,frontend}/*.md`
- 改了架构事实/目录边界 → `docs/architecture/{overview,backend,frontend}/*.md`
- 新增/改 feature → `docs/features/{backend,frontend}/<feature>.md`（参考 [_template.md](../../../docs/features/backend/_template.md)）
- 做了长期架构决策 → 新增 `docs/adr/000N-xxx.md`（不删旧 ADR，被替代时标 superseded）
- 结构变了 → 更新 `docs/README.md` 路由表和文档目录树

## 反模式

- ❌ "设计"里脑补没核实的 API/行为——要么读源码确认，要么标"实施时确认"。
- ❌ 省掉"不在范围"——范围蔓延的根源。
- ❌ 省掉"验证"或写"测试通过"这种没命令的空话——必须列具体门禁命令。
- ❌ 把计划放进 `docs/plans/`——沿用 `.claude/plans/`。
- ❌ 为单文件小改动写计划——直接做。
