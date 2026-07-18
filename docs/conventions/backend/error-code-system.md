---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-18
---

# 错误码体系

## 设计原则

- **错误码是稳定标识,message 是本地化字典派生**:service 只抛 code(+ params),不传 message;message 由 i18n 按 code + locale + params 派生。
- **code 与 message 分离**(对齐 [Google API 指南](https://google.aip.dev/193)):code 是 machine-readable 标识,message 是 human-readable 描述(本地化)。
- **通用码 + 业务码**:通用码(COMMON_*)处理横切错误,业务码(DOMAIN_*)恢复业务语义(客户端按 code 精确处理)。

## 错误码格式

```txt
<DOMAIN>_<REASON>
```

DOMAIN:

- `COMMON`:横切通用(校验/认证/限流/内部错误)
- `AUTH`:认证层
- `USER`/`ROLE`/`PERMISSION`/`ORG`/`PROJECT`/`SETTING`:业务域

## 通用错误码

| Code | HTTP | en defaultMessage | 说明 |
| --- | --- | --- | --- |
| `COMMON_OK` | 200 | OK | 成功 |
| `COMMON_VALIDATION_FAILED` | 422 | Validation failed | Zod 校验失败(defaultHook 全局兜底) |
| `COMMON_UNAUTHORIZED` | 401 | Unauthorized | 未认证 |
| `COMMON_FORBIDDEN` | 403 | Forbidden | 无权限 |
| `AUTH_ACCOUNT_DISABLED` | 403 | Account is disabled | 账号禁用(databaseHooks 拦 session) |
| `AUTH_SIGNUP_DISABLED` | 403 | Sign-up is disabled | 不支持自助注册 |
| `COMMON_NOT_FOUND` | 404 | Resource not found | 多码场景兜底(如"授权不存在") |
| `COMMON_CONFLICT` | 409 | Conflict | 多码场景兜底(如"有子组织或有用户") |
| `COMMON_RATE_LIMITED` | 429 | Too many requests | 限流 |
| `COMMON_SERVICE_UNAVAILABLE` | 503 | Service unavailable | 服务不可用(如 readyz DB 未就绪) |
| `COMMON_INTERNAL_ERROR` | 500 | Internal server error | 内部错误(expose:false,不透传 details) |

## 业务错误码

| Code | HTTP | 场景 |
| --- | --- | --- |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `USER_EMAIL_ALREADY_EXISTS` | 409 | 邮箱已存在 |
| `USER_NO_CREDENTIAL_ACCOUNT` | 404 | 用户无密码账号 |
| `USER_CANNOT_DISABLE_SELF` | 403 | 不能禁用自己 |
| `USER_CANNOT_REVOKE_OWN_AUTH` | 403 | 不能撤销自己的授权 |
| `ROLE_NOT_FOUND` | 404 | 角色不存在(含 source 保护) |
| `ROLE_NAME_CONFLICT` | 409 | 角色名已存在 |
| `PERMISSION_NOT_FOUND` | 404 | 权限不存在(支持 `{permission}` params) |
| `ORG_NOT_FOUND` | 404 | 组织不存在 |
| `ORG_CYCLE` | 409 | 组织会形成环 |
| `ORG_HAS_CHILDREN` | 409 | 组织有子组织 |
| `ORG_HAS_USERS` | 409 | 组织下仍有用户 |
| `PROJECT_NOT_FOUND` | 404 | 项目不存在 |
| `PROJECT_NAME_CONFLICT` | 409 | 项目名已存在 |
| `SETTING_KEY_UNKNOWN` | 422 | 未知配置项 |

## 错误码注册表

[error-registry.ts](../../../apps/backend/src/core/errors/error-registry.ts) 是真相来源。每码 `{ status, defaultMessage(en), expose }`。`ErrorCode` 类型从 registry 派生。

新增错误码:

1. registry 加码(`{ status, defaultMessage, expose: true }`)。
2. [messages.ts](../../../apps/backend/src/core/i18n/messages.ts) 补 zh(`satisfies Record<ErrorCode, string>` 强制完整覆盖,漏补 typecheck 失败)。
3. 业务码随 feature 文档化。

## AppError(code-only)

```ts
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly details?: ValidationErrorDetail[];
  readonly expose: boolean;
  readonly status: number;

  constructor(code: ErrorCode, options: {
    cause?: unknown;
    details?: ValidationErrorDetail[];
    params?: Record<string, string | number>;
  } = {}) {
    super(errorRegistry[code].defaultMessage, { cause: options.cause });  // Error.message = en(originalMessage)
    // ...
  }
}
```

**service 只抛 code(+ params),不传 message**。message 由 i18n 字典派生。

```ts
throw new AppError("USER_NOT_FOUND");
throw new AppError("PERMISSION_NOT_FOUND", { params: { permission: missing } });
```

## i18n(多语言)

- **locale 检测**:`Accept-Language` header(支持 q 值 `fr-CA, fr;q=0.9, en;q=0.8`,对齐 [Better Auth i18n](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/i18n.mdx)),默认 en。见 [locale.ts](../../../apps/backend/src/core/i18n/locale.ts) 的 `detectLocale`。
- **消息字典**:[messages.ts](../../../apps/backend/src/core/i18n/messages.ts),`{ en: <从 registry.defaultMessage 派生>, zh: { ... } }`。en 单一真相,zh 单独维护。
- **translate**:[i18n.ts](../../../apps/backend/src/core/i18n/i18n.ts) 的 `translate(code, locale, params) -> { message, originalMessage }`。模板 `{key}` 填充 params;locale 无该码 fallback en。
- **originalMessage**:恒为 en(填 params),供排障/日志/客户端 fallback。
- **中间件**:`i18nMiddleware` 解析 Accept-Language 注入 `c.var.locale`(挂在 requestId 之后)。

简单模板 `{key}` 起步;复数/性别需求出现再升级 ICU MessageFormat。

## 错误响应 envelope

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "用户不存在",
  "data": null,
  "error": {
    "type": "business",
    "originalMessage": "User not found"
  },
  "meta": { "requestId": "..." }
}
```

- `code`:`z.enum(ErrorCode)`(从 registry 派生,前端 gen:api 得 ErrorCode 联合)。
- `message`:本地化(i18n 按 locale + params 派生)。
- `error.originalMessage`:en 兜底(填 params)。
- `error.details`:validation 时为 `ErrorDetail[]`(`formatZodError` 产出 `{ path, message }[]`)。
- `expose:false` 的码(`COMMON_INTERNAL_ERROR`)message 走 i18n(通用),不透传 details。

## 分层抛错规则

- **service**:只抛 code(+ params),不传 message。如 `throw new AppError("USER_NOT_FOUND")`。
- **middleware**:抛横切错误。如 `throw new AppError("COMMON_UNAUTHORIZED")`。
- **handler**:不做错误分发,交给全局 errorHandler。
- **errorHandler**:`mapError` 透传 code/params/details,`errorResponse` 走 i18n 生成 message + originalMessage。

## Zod validation error

Zod 校验失败统一 `COMMON_VALIDATION_FAILED`,`error.details` 为 `formatZodError` 产出的 `{ path, message }[]`(与 OpenAPI `ErrorDetailSchema` 一致)。`defaultHook`/`error-mapper`/service `safeParse` 都走 `formatZodError`,不透传 Zod 原始 issues(含 `code/expected/received` 等内部字段)。

## OpenAPI 契约

- `ErrorEnvelopeSchema.code` 是 `z.enum(ErrorCode)`(从 registry 派生)。
- `ErrorSchema.originalMessage`:en 兜底。
- `jsonErrorResponse(description, code)`:code 强制传入,response 级 example 按 code 生成(`message` = defaultMessage,`originalMessage` = defaultMessage)。多码场景(如"角色或组织不存在")保留 `COMMON_NOT_FOUND`/`COMMON_CONFLICT`。
