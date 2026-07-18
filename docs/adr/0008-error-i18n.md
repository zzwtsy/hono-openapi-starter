---
status: Accepted
date: 2026-07-18
---

# ADR-0008:错误处理 i18n 演进(code/message 分离 + 多语言)

## Context

错误处理体系(ADR-0002 统一 envelope)存在三个问题:

1. **只有通用码,无业务语义**:所有业务错误复用 `COMMON_NOT_FOUND`/`COMMON_CONFLICT`,客户端无法区分"用户不存在"vs"项目不存在"。
2. **message 来源混乱**:service 传中文 message,与 `defaultMessage`(英文)混杂,三处(code 定义/service/契约)漂移。
3. **无 i18n**:不能按客户端语言返回消息。

## Decision

**code 与 message 分离**(对齐 [Google API 指南](https://google.aip.dev/193) / [Better Auth i18n](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/i18n.mdx)):

1. **错误码体系:通用 + 业务码**。DOMAIN 分 `COMMON`/`AUTH`/`USER`/`ROLE`/`PERMISSION`/`ORG`/`PROJECT`/`SETTING`。业务码恢复语义(`USER_NOT_FOUND` vs `PROJECT_NOT_FOUND`)。同 HTTP 码同语义合并,不每场景一码。
2. **AppError code-only**:service 只抛 code(+ params),不传 message。message 完全由 i18n 字典派生。
3. **i18n 自建轻量字典**:
   - locale 检测:`Accept-Language`(支持 q 值),默认 en。
   - 消息字典:en 从 `registry.defaultMessage` 派生(单一真相),zh 单独维护(`satisfies Record<ErrorCode, string>` 强制完整覆盖)。
   - `translate(code, locale, params)`:模板 `{key}` 填充;`originalMessage` 恒 en(填 params)。
4. **envelope 扩展**:加 `error.originalMessage`(en 兜底),`message` 本地化。`code` 改 `z.enum(ErrorCode)`。
5. **不引入 i18next/@formatjs**:错误消息量小,自建可控;复数需求出现再升级 ICU MessageFormat。

## Consequences

- **正面**:客户端按 code 精确处理;message 多语言自动切换;message 单一来源(i18n 字典),消除漂移;前端 gen:api 得 `ErrorCode` 联合(可类型安全 switch)。
- **负面**:新增错误码需同步 registry + zh 字典(类型强制);多码场景(如"角色或组织不存在")route 契约 example 保留 `COMMON_*`(无法精确单一码)。
- **不做的**:每错误码窄化 literal schema(维护成本高);Better Auth `/api/auth/*` i18n(独立,可选附录);ICU MessageFormat(复数,需求出现再升级)。

## 参考

- [Google API 错误处理指南](https://google.aip.dev/193)
- [Better Auth i18n 插件](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/i18n.mdx)
- [ADR-0002 统一响应 envelope](0002-unified-response-envelope.md)
- [错误码体系规范](../conventions/backend/error-code-system.md)
