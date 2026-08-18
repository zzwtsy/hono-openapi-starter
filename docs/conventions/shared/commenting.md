---
status: Active
owner: backend-platform
lastReviewedAt: 2026-08-17
---

# 注释规范

## 原则

注释解释**为什么**、调用契约与约束/不变式，不复述代码**是什么**。代码应尽量通过命名、小函数和明确类型自解释；注释只补充代码和 TypeScript 类型系统无法可靠表达的信息。

`export` 只表示模块可见性，不自动等于稳定公共 API。是否需要 TSDoc，取决于调用边界、维护风险和信息增量，而不是是否出现 `export` 关键字。

依据：Clean Code 第 4 章、The Art of Readable Code 第 5-7 章、[Google TypeScript Style Guide — Comments and documentation](https://google.github.io/styleguide/tsguide.html) 与 [TSDoc](https://tsdoc.org/)。

## 文档层次

不同信息由各自的 source of truth 负责，不在源码注释里重复维护：

| 信息 | Source of Truth |
| --- | --- |
| 调用契约、维护约束、不变式和非显然副作用 | 源码 TSDoc / 行内注释 |
| HTTP API schema、请求与响应契约 | `createRoute` + OpenAPI |
| 已接受的长期架构决策与取舍 | `docs/adr` |
| 当前架构、feature 行为与开发流程 | `docs/architecture`、`docs/features`、`docs/conventions` |

源码注释不复制 API Reference、架构文档或 ADR。需要导航时使用稳定的 `@see` 或文档链接。

## 必须注释（MUST）

1. **稳定的跨边界契约**：对外 package API、跨模块 core port、registry、扩展接口和回调协议。
2. **安全与业务不变式**：认证、授权、数据隔离、资源所有权以及容易被误删的领域约束。
3. **非显然的运行语义**：副作用、资源生命周期、取消、异常传播、兼容性处理、魔数来源和性能权衡。
4. **有信息增量的配置/schema 字段**：说明领域含义、单位、默认行为、安全影响或验证表达不了的约束。
5. **弃用契约**：使用 `@deprecated`，说明替代方案和迁移路径。

稳定公共 API 会抛错且调用方需要据此处理时，使用 `@throws` 记录抛出条件和异常语义。

## 按需注释与通常不注释

普通应用内部导出只在名称和类型不能表达完整语义时添加 TSDoc。以下代码通常不需要注释：

- 直白常量、简单 helper 和纯类型映射；
- TanStack Router 的 `Route`、名称清楚的页面组件；
- 测试用例和由测试名称已经表达清楚的 fixture；
- 仅重复 Zod 校验、默认值或 TypeScript 类型的字段说明。

如果一段注释只能复述符号名、参数名或实现步骤，应优先删除或改进代码命名。

## TSDoc 规范

### 只写信息增量

`@param`、`@returns` 不带类型，语法为 `@param name - 描述`。只有需要补充取值约束、副作用、所有权或特殊返回语义时才写；不要复述参数名和返回类型。

`@throws` 说明调用方关心的抛出条件和异常语义，不尝试枚举内部实现可能产生的每一种异常。

不用 `@implements`、`@enum`、`@interface`、`@private`、`@override` 等 TypeScript 已能表达的标签。未经项目工具配置，不使用 `@security`、`@performance`、`@variant` 等自定义标签；相关约束写在摘要或 `@remarks` 中。

### @example 与 @see

- `@example` 仅用于复杂且稳定的公共契约，示例必须体现类型和名称无法说明的有效用法。
- 能放入现有测试或示例工程时，应以可执行验证为准；不要用注释示例替代测试。
- `@see` 只指向稳定且确有导航价值的符号或文档，避免链接临时实现细节。

### 单行与多行

- 单行 `/** ... */`：一句话能说清的契约、类型或字段。
- 多行：需要补充约束、异常、`@remarks` 或 `@example` 的稳定 API；第一句必须是摘要。

### 字段级 TSDoc

配置、Zod schema 和接口字段仅在存在领域含义、单位、默认行为或安全影响时使用单行 TSDoc。验证规则本身已经清楚时，不再把 `.min()`、`.default()` 等实现翻译成注释。

## 文件头与行内注释

runner、生成器、扫描器和维护脚本应使用文件头说明：

- 模块责任；
- 处理或扫描范围；
- 明确排除项；
- 失败、取消和清理策略。

普通业务模块不要求文件头。

行内 `//` 注释紧贴被解释代码上方，只说明决策原因、顺序约束、副作用或兼容性。扁平 schema、registry 可使用简短的语义化分组说明，例如 `// Better Auth 配置。`；禁止 `// ===== Helpers =====` 之类纯装饰分隔符。

## TODO / FIXME / HACK

格式：`TODO(责任人, #issue): 描述`，必须带责任人或 issue。

```ts
// TODO(api-123, 2026-06-03): remove v1 alias after mobile release 2.8
// FIXME(alice, #4821): race condition on Linux
```

定期清理；CI 可统计未闭合 TODO。

## 语言

- 注释使用中文，与项目文档一致。
- 标识符、TSDoc 标签、TODO/FIXME/HACK 关键字保留英文。

## 反模式（禁止）

| 反模式 | 例子 | 替代 |
| --- | --- | --- |
| 复述代码 | `i++; // increment` | 删除 |
| 重复类型 | `@param {string} name` | 只在有信息增量时写 `@param name - 描述` |
| 注释掉的代码 | `// const old = ...` | 删除，使用 git 历史 |
| Journal 注释 | `// 2024-01 fixed bug` | 使用 commit message |
| 误导性注释 | 注释说返回 null，实际返回 undefined | 修正代码或注释 |
| 纯装饰分隔符 | `// ===== Helpers =====` | 拆分文件/函数或使用语义化分组说明 |
| Closing brace | `} // end for` | 提取函数或改善结构 |
| 强制空模板 | `/** @param x */` 无实质描述 | 不写或补充真实约束 |
| 署名 | `// by zhangsan` | 使用 git blame |

## 正例（项目代码）

- 维护 runner 文件头：[run-e2e.ts](../../../apps/e2e/src/run-e2e.ts) 说明责任、排除项与清理策略。
- 生命周期契约：[runner-lifecycle.ts](../../../apps/e2e/src/runner-lifecycle.ts) 记录 readiness、提前退出与取消语义。
- 类型 TSDoc：[visibility-policies.ts](../../../apps/backend/src/core/audit/visibility-policies.ts) 描述审计查询操作者约束。
- 行内 why：[create-app.ts](../../../apps/backend/src/core/app/create-app.ts) 说明全局中间件写入 requestId 的顺序约束。
- 字段级 TSDoc：[env-schema.ts](../../../apps/backend/src/config/env-schema.ts) 说明认证密钥等配置的安全约束。

## 评审 checklist

- [ ] 稳定跨边界契约、关键不变式和非显然生命周期是否有必要说明？
- [ ] 是否误把所有 `export` 都当成公共 API？
- [ ] TSDoc 是否只提供类型系统之外的信息？
- [ ] `@param`、`@returns`、`@throws` 是否没有复述名称和类型？
- [ ] `@example` 是否确有教学价值，并尽可能由测试验证？
- [ ] 维护脚本是否说明责任、范围、排除项与失败/清理策略？
- [ ] 是否存在过时、误导、注释掉的代码、journal 或装饰分隔符？
- [ ] TODO 是否带责任人或 issue？
- [ ] 改动代码时是否同步更新相关注释？
- [ ] 注释语言是否符合约定？
