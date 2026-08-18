# Skills 维护规范

本目录是技能内容源,`.claude/skills/` 下全是符号链接指向这里。

## 目录约定

- 内容源:`.agents/skills/<name>/SKILL.md`。
- 可选 UI 元数据:`.agents/skills/<name>/agents/openai.yaml`;由 `skill-creator` 生成并与 `SKILL.md` 保持一致,不参与触发判断。
- 加载入口:`.claude/skills/<name>` -> `../../.agents/skills/<name>`(符号链接)。
- **不要在 `.claude/skills/` 放真实目录**;内容放本目录再符号链接。

## 两类技能

- **vendored 技能**(alova、shadcn、vitest、better-auth、vercel-* 等):由根目录 `skills-lock.json` 锁定外部 github 源,不手改;更新走 lockfile。
- **自定义流程技能**(如 `execution-plan`、`feature-pr`):固化项目重复工作流,手写维护。

## 新增自定义技能

1. 使用 `skill-creator` 在 `.agents/skills/` 初始化技能,不创建不需要的 scripts/references/assets。
2. 编辑 `SKILL.md`(frontmatter 只用 `name` + `description`,description 写清触发条件)。
3. 需要 UI 元数据时保留生成的 `agents/openai.yaml`,修改 skill 后同步更新。
4. 建符号链接:`ln -s ../../.agents/skills/<name> .claude/skills/<name>`。
5. 使用 `skill-creator` 的 `quick_validate.py` 校验技能目录。
6. 不进 `skills-lock.json`(那是 vendored 专用)。

## 复用优先

遇到重复工作流,先看已有技能是否覆盖,再考虑新增。技能按 description 自动触发,不必在 AGENTS.md 点名。
