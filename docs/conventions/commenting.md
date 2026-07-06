---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-06
---

# 注释规范

## 原则

注释解释**为什么**与**约束/不变式**,不解释**是什么**。代码应尽量自解释(好的命名、小函数、明确类型),注释补充代码无法表达的部分。

> LLM 时代:"为什么"和"约束"注释价值上升(给 AI 上下文,防止 AI 破坏不变式),"是什么"价值下降(AI 可即时解释)。强化前者,弱化后者。

依据:Clean Code 第 4 章、The Art of Readable Code 第 5-7 章、[Google TypeScript Style Guide — Comments and documentation](https://google.github.io/styleguide/tsguide.html)。

## 必须注释(MUST)

1. **导出符号**:所有 `export` 的函数、类、接口、类型别名、枚举、常量必须有 TSDoc 块(`/** */`),第一句为摘要。
2. **公共 API 抛错**:用 `@throws` 记录抛出条件与异常类型(TS 类型系统不编码异常,`@throws` 有信息增量)。
3. **弃用**:用 `@deprecated` 并给出替代方案。
4. **配置项 / schema 字段**:env 字段、zod schema 字段用字段级 TSDoc 说明含义与约束。
5. **非显然的决策与代码**:副作用、不变式、兼容性 hack、魔数来源、性能权衡、被掩盖的复杂度(防止后人误删)。

## TSDoc 规范

### 不重复 TypeScript 类型

`@param`/`@returns` **不带类型**(语法 `@param name - 描述`,对比 JSDoc `@param {string} name`)。TS 已有类型,注释只补类型无法表达的。

不用 `@implements`/`@enum`/`@private`/`@override` 等(用 TS 的 `implements`/`enum`/`private`/`override` 关键字)。

> TSDoc 规范本身包含这些标签,但遵循 Google TS 建议不用——TS 关键字已表达。

### @param / @returns 仅信息增量时写

避免复述参数名/类型(反例:`@param fooBarService The Bar service`)。`@param`/`@returns` 仅在补充约束、副作用、返回值语义(如返回 null 表示未找到、不改原数组)时写,否则省略。

### @throws 记录抛错条件

TS 不编码异常,`@throws` 有信息增量。公共 API 抛错必须记录条件与异常类型。

### 单行 vs 多行

- 单行 `/** ... */`:一句话能说清(类型、helper)
- 多行:公共 API 有多段说明;第一句为**摘要**(IDE 悬浮卡片只显示这句),后续用 `@remarks`、`@example` 扩展

### 字段级 TSDoc

zod schema 字段、配置对象字段、接口字段用单行 `/** ... */` 说明含义与约束。

## 行内注释 //

解释**为什么**(决策原因、约束、副作用),紧贴被解释代码上方。不重复代码做什么。

## TODO / FIXME / HACK

格式:`TODO(责任人, #issue): 描述`,必带责任人或 issue。

```ts
// TODO(api-123, 2026-06-03): remove v1 alias after mobile release 2.8
// FIXME(alice, #4821): race condition on Linux
```

定期清理;CI 可统计未闭合 TODO。

## 语言

- 注释**中文**(与项目文档一致)
- 标识符、TSDoc 标签、TODO/FIXME/HACK 关键字**英文**

## 反模式(禁止)

| 反模式 | 例子 | 替代 |
| --- | --- | --- |
| 复述代码 | `i++; // increment` | 删 |
| 重复类型 | `@param {string} name` | 用 `@param name - 描述` |
| 注释掉的代码 | `// const old = ...` | 删,用 git |
| Journal 注释 | `// 2024-01 fixed bug` | 用 commit message |
| 误导性注释 | 注释说返回 null 实际 undefined | 修代码或修注释 |
| 分隔符 / position marker | `// ===== Helpers =====` | 拆函数/文件 |
| Closing brace | `} // end for` | 提取函数 |
| 强制空模板 | `/** @param x */` 无描述 | 不写或写实质内容 |
| 署名 | `// by zhangsan` | 用 git blame |

## 正例(项目代码)

- 模块 TSDoc:[better-auth.ts](../../apps/backend/src/core/auth/better-auth.ts) 的 `/** Better Auth 实例。... */`
- 类型 TSDoc(单行):[transaction.ts](../../apps/backend/src/db/transaction.ts) `/** repository 方法统一接收的执行上下文 */`
- 行内 why:[create-app.ts](../../apps/backend/src/core/app/create-app.ts) `// 全局中间件必须先写入 requestId...`
- 字段级 TSDoc:[env-validation.ts](../../apps/backend/src/core/app/env-validation.ts) `/** 认证服务的密钥, 长度必须至少 32 位 */`

## 评审 checklist

- [ ] 导出符号有 TSDoc?
- [ ] TSDoc 不重复 TS 类型?
- [ ] @param/@returns 有信息增量(不复述名字/类型)?
- [ ] 公共 API 抛错有 @throws?
- [ ] 非显然决策有 why 注释?
- [ ] 无注释掉的代码 / journal / 分隔符?
- [ ] TODO 带责任人/issue?
- [ ] 改动代码同步注释?
- [ ] 注释语言符合约定(中文)?
