---
name: git-commit
description: git commit 规范（标题格式/body 结构/拆分原则）。当用户说"写 commit/写提交信息/提交一下/commit 一下"或 agent 准备执行 git commit 时触发。
---

# Git Commit 写法

Conventional commit 格式 `<type>(<scope>): <摘要>` 容易出现三个问题：标题塞实现细节超 72 字符、标题混入计划编号（B3/G1/Phase A）、标题用括号做"二级拆解"把 body 的活干了。本 skill 固化正确写法。

## 何时用 / 何时不用

- **用**：任何 `git commit` 前--标题怎么写、要不要 body、怎么拆分。
- **不用**：单文件小改且标题已完全自解释（如 `docs: 修正错别字`），直接提交。

## 标题

```
<type>(<scope>): <动词式摘要>
```

### type

`feat` / `fix` / `refactor` / `docs` / `chore` / `test` / `ci` / `build`

### scope

模块名，单数：`iam` / `frontend` / `core` / `projects` / `auth` / `openapi` / `backend`。
多 scope 用逗号无空格：`fix(iam,core)`。

### 摘要

- 动词开头，说"做了什么"，不写"怎么做的"
- 中文为主，勿混英文
- 长度 ≤ 50 字符最佳，**硬上限 72 字符**（含 type/scope/冒号）
- 禁止实现细节、文件名、依赖名、计划编号（`B3`/`G1`/`Phase A`/`P1a`）、PR 编号（squash 自动追加 `(#N)`）

### 正例

```
feat(iam): 用户组织调岗与授权清理
fix(frontend): 闭合一屏布局高度链
refactor(openapi): 收敛 summary/description 写法
docs(iam): 同步 user-detail-panel 目录结构
```

### 反例

**① 标题塞实现细节，超 72 字符**：
```
feat(core): userId 注入请求级 logger context(appendContext 绕开 withContext 类型误报)
```
改为（括号里的实现细节移到 body）：
```
feat(core): userId 注入请求级 logger context
```

**② 标题混入计划编号**：
```
fix(iam,core): OpenAPI 契约保障闭环 B3(description 补全/contract 规则/details 契约对齐)
```
改为（`B3` 是计划内部编号，对历史读者无意义，删除）：
```
fix(iam,core): 收敛 OpenAPI 契约保障(description/contract/details 对齐)
```

**③ 标题用括号做二级拆解**（把 body 的活干了）：
```
fix(frontend): 前端工程化 B5(boundary 盲区/AuthState 下沉/静默 403/hitSource/useLogin 异步/去重)
```
改为（拆解移到 body，标题只留主语）：
```
fix(frontend): 前端工程化收尾(boundary/AuthState/403/缓存)
```

括号的使用界限：可用来限定"哪方面"（如 `description/contract/details 对齐`，是摘要的合理收窄）；不可用来塞实现细节、文件名、编号或逐条拆解。

## body

分点展开，每点一个改动维度。好范式：

```
- useRequest 改 useWatcher 监听 orgId,切换视角或调岗后自动重拉数据
- 调岗成功后 URL org 参数同步设为新 org,防止视角卡在旧 org
- 文档同步 frontend/iam.md
```

### 规则

- 用 `-` 列表，每点一句
- 说明动机/为什么（尤其是 refactor 和 fix），不只是"改了什么"
- 关联计划文件或上游 PR（如 `计划: docs/plans/xxx.md`）
- 涉及破坏性改动 / migration / 契约变化时必须写明
- 用多个 `-m` 传给 git：`git commit -m "标题" -m "正文要点"`

### 何时必须写 body

| 场景 | 必须有 body |
| --- | --- |
| 新功能（feat） | 是，说明动机和范围 |
| 引入/升级依赖 | 是，说明理由 |
| 破坏性改动 / migration | 是，说明影响和升级路径 |
| refactor 涉及多文件/多模块 | 是 |
| fix 涉及非显然的根因 | 是 |
| 文档错别字、单文件小改 | 可省 |

反例：`feat(frontend): 顶部加载进度条(Bprogress + TanStack Router)` 引入新依赖和新功能却无 body，应补动机和范围。

## 拆分

- 代码改动和文档收敛分开 commit
- 一个 commit 一个逻辑改动；一个 PR 内多个逻辑改动就多个 commit
- 用显式文件列表 `git add <files>`，禁止 `git add -A`

## 工作流

1. **暂存**：用显式文件列表 `git add <file>...`，代码/文档分开。
2. **定 type/scope**：从改动触及的模块定 scope；跨模块用逗号。
3. **写标题**：动词式摘要，≤ 72 字符，不含实现细节/编号。
4. **判 body**：按上表判断；要写则分点，含动机和范围。
5. **提交**：`git commit -m "标题" -m "正文"`。

```bash
# 代码 commit
git add apps/backend/src/.../xxx.ts
git commit -m "feat(iam): 用户组织调岗与授权清理" -m "- PATCH 端点转移 home org
- 子树内校验 + 旧路径 grant 清理
- 7 unit + 9 integration 测试
- 计划: docs/plans/user-org-transfer.md"

# 文档 commit(分开)
git add docs/...
git commit -m "docs(iam): 同步组织调岗端点文档"
```

## 反模式

- ❌ 标题塞实现细节 / 文件名 / 依赖名 -> 移到 body。
- ❌ 标题带计划编号（`B3`/`G1`/`Phase A`）-> 移到 body 或删除。
- ❌ 标题超 72 字符 -> 拆到 body。
- ❌ 标题中英文混用 -> 统一中文。
- ❌ feat / 引入依赖 / 破坏性改动无 body -> 补动机和范围。
- ❌ `git add -A` 一把梭 -> 代码/文档分开 commit。
- ❌ 手写 `(#N)` PR 编号 -> squash 合并自动追加。
- ❌ 一个 commit 混多个不相关 scope -> 拆成多个 commit。
