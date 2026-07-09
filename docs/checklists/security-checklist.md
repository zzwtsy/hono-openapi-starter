---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-08
---

# 安全 Checklist

## 强制项

- [x] 环境变量使用 Zod 校验，启动时失败即中止。
- [x] 所有响应包含 `X-Request-Id`。
- [x] 所有日志包含 `requestId`。
- [x] 启用 secure headers。
- [x] CORS 使用 allowlist，不在 credentials 模式下使用 `*`。
- [x] 启用 body limit。
- [x] Better Auth 配置 trusted origins。
- [x] Better Auth 配置 secret。
- [x] Better Auth auth endpoint 使用 rate limit。
- [x] 日志脱敏 authorization、cookie、password、token、secret。
- [x] 未知错误不暴露 stack 和数据库细节。
- [x] 生产环境不输出 pretty log。

## 推荐项

- [ ] 关键写操作写 audit log。
- [x] 受保护接口标注 OpenAPI security。
- [x] 使用 `requirePermission()` 管理授权。
- [ ] 数据库迁移使用 expand / contract。
- [ ] 对关键副作用接口启用 idempotency key。
- [ ] 定期审计错误码和权限矩阵。
