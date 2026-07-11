---
name: feature-pr
description: 在 feature/fix 分支上把已验证全绿的改动提成 GitHub PR 合并到 main。当用户说"创建 PR/提 PR/发 pull request/合并到 main/准备合入"时触发。固化项目里 4 个已合并 PR（#1-#4）的分支命名、commit 规范、PR body 格式，并用 --body-file 规避中文 body 的 shell 编码重试问题。
---

# Feature 分支 PR

本项目所有 feature/fix 都走"分支 -> 验证全绿 -> PR 合并 main"。已合并 PR #1–#4 都是这个流程。
本 skill 把流程和 body 格式固化，重点解决 `gh pr create` 中文 body 的重试问题（PR #2/#3/#4 创建时各重试 2–3 次因 body 编码）。

## 前置条件

- 改动已在分支上完成，**验证门禁全绿**（见 [execution-plan](../execution-plan/SKILL.md) 的"验证门禁链"）。没全绿别提 PR。
- main 是干净的，已 `git pull --ff-only`。

## 分支命名

从最新 main 切：`feat/<scope>`（新功能）或 `fix/<scope>`（修 bug）。scope 用 kebab-case。

一个大改造拆成多个顺序 PR 时（参考 PR #2 -> #3 -> #4）：每个 PR 一个分支，前一个合并后 `git switch main && git pull --ff-only` 再切下一个。

## 提交

- **选择性暂存**：代码和文档分别 commit（文档收敛单独一个 commit）。用显式文件列表 `git add <files>`，别 `git add -A`。
- **Conventional commit 标题**：`<type>(<scope>): <摘要>`，type 用 feat/fix/refactor/docs/chore/test/ci/build。
- body 用中文时用多个 `-m`：`git commit -m "标题" -m "正文要点"`。
- squash 合并时 GitHub 会自动在标题追加 `(#N)`，别手写编号。

## PR body（用 --body-file，别内联）

中文 + markdown 内联传给 `gh pr create --body "..."` 会因 shell 转义/编码失败重试。**写到临时文件再 `--body-file`**。

body 模板（项目既有格式）：

```markdown
## 背景 / 概述

为什么做这个改动，一两句。承接哪个计划/PR（链接 `.claude/plans/xxx.md` 或上个 PR）。

## 改动

- 关键改动 1（链接源码 `apps/.../xxx.ts`）
- 关键改动 2

## 验证

- `pnpm --filter backend typecheck` ✅
- `pnpm lint` ✅
- `pnpm --filter backend test` ✅
- （integration / build 视改动按需补）

## commit 清单（可选）

- `feat(scope): xxx`
- `docs: xxx`
```

## 命令序列

```bash
# 1. 切分支（从干净 main）
git switch main && git pull --ff-only
git switch -c feat/<scope>

# 2. 选择性暂存 + commit（代码、文档分开）
git add apps/backend/src/.../xxx.ts
git commit -m "feat(scope): 摘要" -m "正文"
git add docs/...
git commit -m "docs: 同步 xxx 规范"

# 3. 推送
git push -u origin feat/<scope>

# 4. 写 PR body 到临时文件
bodyfile=$(mktemp /tmp/pr-body.XXXXXX.md)
cat > "$bodyfile" <<'EOF'
## 背景
...
EOF

# 5. 建 PR（--body-file 规避编码重试）
gh pr create --base main --head feat/<scope> \
  --title "feat(scope): 摘要" \
  --body-file "$bodyfile"

# 6. 确认状态
gh pr view --json number,state,title,url
```

## 反模式

- ❌ 把长中文 body 内联给 `gh pr create --body "..."`--用 `--body-file`。
- ❌ 验证门禁没全绿就提 PR。
- ❌ 一个 PR 混多个不相关 scope--拆成顺序 PR（参考 #2/#3/#4）。
- ❌ `git add -A` 一把梭--代码/文档分开 commit，便于 review 和回滚。
- ❌ 手写 `(#N)` 编号--squash 合并自动追加。
