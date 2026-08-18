---
name: typescript-commenting
description: 按项目规范编写、审查或清理 TypeScript/TSX 源码注释。用户明确要求补注释、审查注释、调整 TSDoc/JSDoc、统一注释风格，或检查维护脚本注释质量时使用；普通 TypeScript 功能开发不自动触发。
---

# TypeScript 注释审查

## 工作流

1. 完整读取仓库根和目标目录适用的 agent 指令，再完整读取 `docs/conventions/shared/commenting.md`。以正式规范为唯一事实源，不从本 skill 推断另一套注释规则。
2. 按用户指定路径确定范围；未指定时检查 staged、unstaged 和 untracked 的 TypeScript/TSX 变更。先查看 diff 和调用方，再判断注释是否有信息增量。
3. 排除生成物、vendored 代码及用户未授权修改的文件。测试、常量、路由和简单 helper 默认不是补注释目标，除非包含规范要求说明的非显然契约。
4. 逐个候选判断是否涉及稳定边界、不变式、安全约束、副作用、资源生命周期、取消、异常传播或维护脚本责任。没有这些信息时不添加注释。
5. 添加必要的 TSDoc、文件头或行内 why 注释；同时删除复述名称/类型、已经过时、与实现冲突或仅作装饰的注释。修改注释前后都核对实际代码路径，避免把推断写成事实。
6. 仅在复杂且稳定的公共契约确有教学价值时使用 `@example`。优先让现有测试或示例工程承担可执行证明，不用注释示例替代测试。
7. 复查最终 diff，确认没有因 `export` 关键字机械补注释，也没有遗漏随代码变化而失效的既有注释。

## 边界

- 源码注释只记录调用契约和维护约束；HTTP API 契约、架构事实和长期决策分别回到仓库规定的 OpenAPI、architecture/conventions 和 ADR source of truth。
- 不把注释任务扩展为安装 TypeDoc、生成 API 文档、创建 ADR、修改 CI、启用 `require-jsdoc` 或追求注释覆盖率。
- 不使用未经项目工具配置的自定义 JSDoc 标签，不复制 TypeScript 已表达的类型信息。
- 若用户只要求审查，保持只读并给出离散、可执行的意见；只有明确要求修改时才编辑文件。

## 验证

按实际改动选择最小可证明闭环：

- 运行受影响 workspace 的 typecheck 和定向测试；
- 使用 `CI=true pnpm -w lint` 验证 TSDoc/JSDoc 语法和项目规则；
- 修改正式文档时运行 `pnpm docs:frontmatter` 与 `pnpm docs:links`；
- 最后运行 `git diff --check`，并报告未执行检查的原因。
