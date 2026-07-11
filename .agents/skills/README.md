# Skills 维护规范

本目录是技能内容源,`.claude/skills/` 下全是符号链接指向这里。

## 目录约定

- 内容源:`.agents/skills/<name>/SKILL.md`。
- 加载入口:`.claude/skills/<name>` -> `../../.agents/skills/<name>`(符号链接)。
- **不要在 `.claude/skills/` 放真实目录**;内容放本目录再符号链接。

## 两类技能

- **vendored 技能**(alova、shadcn、vitest、better-auth、vercel-* 等):由根目录 `skills-lock.json` 锁定外部 github 源,不手改;更新走 lockfile。
- **自定义流程技能**(如 `execution-plan`、`feature-pr`):固化项目重复工作流,手写维护。

## 新增自定义技能

1. 在 `.agents/skills/<name>/SKILL.md` 写内容(frontmatter 用 `name` + `description`,description 写清触发条件)。
2. 建符号链接:`ln -s ../../.agents/skills/<name> .claude/skills/<name>`。
3. 不进 `skills-lock.json`(那是 vendored 专用)。

## 复用优先

遇到重复工作流,先看已有技能是否覆盖,再考虑新增。技能按 description 自动触发,不必在 AGENTS.md 点名。
