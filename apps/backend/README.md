# Backend

Hono + TypeScript + Drizzle + Better Auth + @hono/zod-openapi 后端。

## 前置

- Node.js 24+
- pnpm
- PostgreSQL（本地或 docker）

## 安装

```sh
pnpm install
cp .env.example .env
# 编辑 .env：DATABASE_URL、BETTER_AUTH_SECRET（至少 32 位）等
```

## 数据库

```sh
pnpm db:generate    # 从 schema 生成 migration（改 schema 后）
pnpm db:migrate     # 执行 migration
pnpm db:bootstrap   # 首次部署：建根组织 + 第一个 admin（env: BOOTSTRAP_ADMIN_EMAIL/PASSWORD）
pnpm db:seed        # dev 演示数据（仅 development）
```

## 开发

```sh
pnpm dev            # 启动（热重载）
# API Reference: http://localhost:3001/reference
```

## 测试

```sh
pnpm test              # unit
pnpm test:integration  # integration（testcontainers PG）
pnpm test:all          # 全部
```

## 其他

```sh
pnpm typecheck
pnpm lint
pnpm build
```
