---
status: Active
owner: backend-platform
lastReviewedAt: 2026-07-16
---

# 模板 IAM 完成度 Checklist

面向 **模板 day-0 正确默认** 的验收清单，不是生产租户的迁移清单。  
模板不为「向下兼容」保留半残路径；未勾选项 = 已知缺口或有意边界，合入相关改动后应回写勾选并更新 `lastReviewedAt`。

**权威规范**（本清单不替代它们）：

- [ADR-0004：权限层自建](../adr/0004-authorization-layer.md)
- [权限层规范](../conventions/backend/authorization.md)
- [Better Auth 集成](../conventions/backend/auth-better-auth.md)
- [Feature: iam（后端）](../features/backend/iam.md)
- [Feature: iam（前端）](../features/frontend/iam.md)

**读法**：

| 标记 | 含义 |
| --- | --- |
| `[x]` | 当前实现已满足（以代码为准，改完后核对） |
| `[ ]` | 未满足；若标 **P0/P1** 则影响「模板良好默认」 |
| Non-goals | 有意不做，**不算**完成度失败 |

---

## 0. 概念模型（写进文档即验收）

模板应将下列轴线写死，并与 API/UI 用词一致：

| 轴线 | 含义 | 模板目标 |
| --- | --- | --- |
| Home org | 用户人事归属，`user.orgId` 单值 | 凡创建用户的路径必有合法 home |
| 管理范围 | 谁能对哪些用户/grant 做写操作 | 操作者 home 的 **自身 + 子孙**（子树） |
| Grant org | 角色/直接权限绑定的组织节点 | 检查时 **祖先继承**（已实现） |

- [x] 文档区分认证（Better Auth）与授权（自建权限层）
- [x] 授权检查算法：祖先集 + 角色∪allow − deny + 过期过滤（PDP）
- [x] 文档显式定义 Home org / 管理子树 / Grant org 三词（避免与「切换组织」混淆）
- [ ] 成员 CRUD 的管理范围与授权写路径的管理范围 **同一套子树定义**

---

## 1. PDP（策略计算）— 已较完整

- [x] 组织树 `parent_id` + 检查时向上祖先 CTE（`CYCLE` 兜底）
- [x] 用户可多角色（`user_roles` 多行）
- [x] 直接授权 allow / deny
- [x] deny 覆盖 allow，并随祖先向下传播
- [x] `expires_at` 在检查时过滤（null = 永不过期）
- [x] `PermissionChecker` Port + `IamPermissionChecker` Adapter
- [x] 请求级 ALS memoize（`PermissionService`）
- [x] `/api/v1/me` 返回相对 **home org** 的有效权限全集（无 org 时 `[]`）

**非缺口（可选增强）**

- [ ] Redis / 跨请求权限缓存与事件失效（Non-goal / 后续）
- [ ] 过期 grant 的后台 housekeeping（不影响正确性）

---

## 2. PEP（执行点）

- [x] `requireAuth` 注入 session user
- [x] `requirePermission(perm)` 默认 `orgId = user.orgId`
- [x] `requirePermission(perm, { orgId })` 支持显式目标组织
- [x] `requireOrgUser`：无 user → 401；`orgId == null` → 403
- [x] 业务路由（如 projects）按 home org 做数据隔离
- [ ] 管理类写操作在「目标 org ≠ home」时，是否统一显式传 `orgId` 做 PEP 检查（与子树模型对齐时再验收）

---

## 3. 权限目录与粒度

### 3.1 目录机制

- [x] 各 feature `permissions.ts` + declaration merging → `AppPermission`
- [x] 组装点 `permissions-catalog` + `AllPermissionsCovered` 编译期覆盖
- [x] 启动 `syncAuthorizationCatalog` upsert 权限与 admin 角色
- [x] 前端 `AppPermission` 经 gen:api 与后端同源（不手写第二份名单）

### 3.2 粒度（模板目标态）

当前实现：

- [x] `projects.*` 细粒度（read/create/update/delete）
- [x] `users.*` 细粒度（read/create/update/reset-password/disable/enable）
- [x] `settings.read` / `settings.update`
- [x] `iam.read` / **`iam.manage`（写侧仍为粗粒度一锅）**

模板推荐默认（**消灭 `iam.manage` 一锅，但不要拆到每 HTTP 动词**）：

- [ ] 删除或停止使用单一写权限 `iam.manage`
- [ ] `organizations.manage`（或等价命名）：组织树 create/update/delete
- [ ] `roles.manage`：实例角色 CRUD + 角色权限挂载
- [ ] `assignments.manage`：用户角色/直接权限的授与撤
- [ ] 保留单一 `iam.read` 覆盖 IAM 只读面（不必再拆三个 `*.read`）
- [ ] 前端 Can / 路由与后端 middleware 同步上述三分
- [ ] admin 角色仍同步全部权限；文档说明自定义角色如何勾选

**不推荐作为模板默认**：每个 assign/revoke/create 各一个 permission（目录膨胀、假 SoD）。

---

## 4. 成员模型（Home）— 完成度偏低

- [x] `user.orgId` 作为单归属（单组织模型）
- [x] `createUser` 能写入 orgId（当前 = 操作者 home）
- [x] `listUsers` 按 org 过滤（当前 = **精确等于** 操作者 home，**不含子孙**）
- [x] `updateUser` 不可改 orgId（有意；但导致无调岗能力）
- [ ] **创建用户**可选目标 org，且目标 ∈ 操作者管理子树（含自身）
- [ ] **listUsers / 用户写操作**管理范围 = 同一子树（与 create 对称）
- [ ] **管理员变更归属（调岗）** API：改 `user.orgId`，含子树校验
- [ ] 调岗时 **grant 清理策略写死**（推荐默认：清旧 home 节点上的 user_roles/user_permissions，或清空全部 grant 后重授——二选一写进 feature 文档）
- [ ] 所有创建用户路径（bootstrap / seed / createUser；若保留注册则含注册）**禁止**产出 `orgId == null`
- [ ] `orgId` / `disabled` additionalFields 配置 **`input: false`**（防客户端写入）

**Non-goals（不算失败）**

- [ ] 用户多 home / 登录后自助切换组织
- [ ] 硬删除用户（禁用替代）

---

## 5. 授权写入（PAP · assignments）

- [x] 授/撤角色、授/撤直接权限 API 与 UI
- [x] grant 绑定 org + 可选 expiresAt
- [x] 直接权限 allow | deny
- [x] 校验 role / permission / org **存在性**
- [ ] 校验目标 **user 存在**且在操作者**管理范围内**（当前主要依赖 FK）
- [ ] 校验 **grant.orgId** 在操作者管理子树内（禁止任意 org 乱授）
- [ ] 重复授角色时 **续期/更新 expiresAt** 语义明确（今日 `onConflictDoNothing` 会静默忽略续期）

---

## 6. 组织树（PAP · organizations）

- [x] 组织 CRUD、改 parent 防环、有子拒删
- [x] 扁平 list + 前端建树
- [x] `listOrganizations` 需 `iam.read`
- [ ] 读路径是否按管理范围过滤（全表 list 对「仅根 admin」可接受；子树管理员落地前必须过滤或保持「仅全局 admin 可读全树」的文档约束）
- [ ] 写路径与 `organizations.manage`（或现今 `iam.manage`）+ 子树约束一致

---

## 7. 角色定义（PAP · roles）

- [x] 实例角色 CRUD；`source=code|instance`；code 角色不可改删
- [x] admin 代码角色同步全部权限
- [x] 角色权限挂载 API + UI
- [ ] 权限从代码移除后 DB 行清理策略（文档/运维说明即可）
- [ ] 与 `roles.manage` 细粒度对齐（见 §3.2）

---

## 8. 用户供给路径

| 路径 | 目标态 | 当前 |
| --- | --- | --- |
| bootstrap 首管 | 有 home + admin 角色 | [x] |
| seed 演示用户 | 有 home + 角色 | [x] |
| 管理员代建 | 有 home（目标子树内） | [ ] 仅本 org、不可选 |
| 公开自助注册 | **模板默认不提供** | [ ] 仍存在 UI + 运行时开关，且可产生无 home 用户 |

- [ ] 移除公开注册产品面（路由/表单/登录链/设置开关）
- [ ] 后端对 `/api/auth/sign-up/*` **永久拒绝**（不依赖 DB 开关）
- [ ] `system_settings` 退役 `signUp` key（或文档声明无内置 key）
- [ ] ADR-0007 / feature 文档与「不提供自助注册」一致（历史决策可注记 superseded 片段）

**Non-goals**

- [ ] 邮件验证、找回密码邮件
- [ ] 邀请制（可作为扩展文档，默认不实现）

---

## 9. 体验与身份闭环

- [x] 禁用用户：disabled + 拦 session + 可清 session
- [x] 管理员重置密码
- [ ] 新用户「有 home、无业务权限」的空状态或默认 member 角色（二选一写死）
- [ ] `/api/v1/me` PATCH（自助改资料，可选）
- [ ] 用户查看自己的 grants（可选；管理端已有按 userId 查询）

---

## 10. 前端门控与契约

- [x] 前端权限名来自 OpenAPI / gen:api
- [x] 路由/侧栏与后端权限名对齐（users / projects / settings / iam.read）
- [x] 前端仅 UX，后端 PermissionChecker 为权威
- [ ] 去掉 `iam.manage` 后 UI 全量改为三分 manage
- [ ] 用户列表/表单与「子树管理范围」一致（创建选 org、列表见子树用户）
- [ ] 无公开注册入口

---

## 11. 安全与运营（IAM 相关）

- [x] 认证端点 rate limit
- [x] 敏感日志脱敏
- [ ] 关键 IAM 写操作 **audit log**（谁给谁在何 org 授了什么）
- [ ] 认证后日志上下文带 **userId**（见可观测性 checklist）
- [ ] 定期核对权限矩阵 / 错误码（与安全 checklist「推荐项」呼应）

---

## 12. 测试覆盖（IAM）

- [x] 权限检查 integration（祖先/deny/过期等）
- [x] iam 路由 unit（鉴权 + 接线）
- [x] iam-users integration（代建/禁用/重置等，随实现演进）
- [x] 前端 hasPermission / requirePermission / Can 等单测
- [ ] 子树 create/list/assign 越权用例（实现后补）
- [ ] 调岗 + grant 清理用例（实现后补）
- [ ] 无公开注册 / sign-up 恒拒绝（实现后补）

---

## 13. 有意 Non-goals（不要勾成「欠债」）

以下 **默认不实现**；出现需求时应新开 ADR/feature，而不是 silently 塞进清单当 P0：

- 用户多组织 membership + 登录切换当前组织
- 分级管理员完整产品（在写路径子树硬边界就绪前不要假装已支持）
- Redis 权限缓存、权限事件总线
- 硬删除用户
- 邮件验证 / 魔法链邀请（除非单独 epic）
- OpenAPI lint 进 CI（项目决策可不做时，不列入本清单强制项）

---

## 14. 建议落地顺序（模板「良好默认」）

合入时按序推进，避免「只拆权限名、不做范围」：

1. **文档**：§0 三轴线写进 `authorization.md` / `iam.md`
2. **去注册**：消灭无 home 供给路径
3. **成员子树**：create 选 org + list/写操作子树 +（建议）调岗
4. **授权写路径子树校验** + 授角色续期语义
5. **拆 `iam.manage`** → `organizations|roles|assignments.manage`
6. **体验**：空状态或默认 member
7. **运营**：audit / userId 日志（可并行）

---

## 15. 变更时如何维护本清单

1. 实现某项后：勾选对应 `[ ]` → `[x]`，必要时改「当前/目标」措辞。  
2. 更新 `lastReviewedAt`。  
3. 若改变目标态（例如恢复邀请注册）：先改本清单与 feature 文档，再改代码。  
4. PR 描述可引用本节编号（如「关闭 checklist §8 注册项」）。
