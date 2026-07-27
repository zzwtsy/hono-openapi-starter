import { createAlova } from "alova";
import adapterFetch from "alova/fetch";
import reactHook from "alova/react";
import { env } from "@/lib/env";
import { createApis, mountApis, withConfigType } from "./createApis";

/** 后端统一响应 envelope(见 backend core/http/openapi/components.ts)。 */
interface ApiResponse {
  success: boolean;
  code: string;
  message: string;
  data: unknown;
  error: unknown;
  meta: { requestId: string };
}

// 扩展 method metadata:raw 标记跳过 envelope 剥离。
// 后端规范(docs/conventions/response-envelope.md):业务 API(/api/v1/*)必须 envelope,
// Better Auth /api/auth/* 例外但前端走 Better Auth client 不经 alova;
// 未来若有非 envelope 业务端点走 alova(文件下载/SSE/二进制),用 meta.raw 标记返回原始响应。
declare module "alova" {
  interface AlovaCustomTypes {
    meta: { raw?: boolean };
  }
}

// alova 实例:同源(经 vite proxy)+ react statesHook + envelope 运行时剥离。
// 类型剥离在 alova.config.ts 的 handleApi 完成(生成类型 = data 类型),
// 这里 responded 运行时剥 envelope,两端一致。
export const alovaInstance = createAlova({
  baseURL: env.VITE_API_BASE_URL,
  statesHook: reactHook,
  requestAdapter: adapterFetch(),
  responded: {
    onSuccess: async (res, method) => {
      // 非 envelope 端点(如文件下载)用 meta.raw 标记,返回原始 Response 由调用方处理
      if (method.meta?.raw === true) {
        return res;
      }
      // session 过期/无效:业务 API 401 即 cookie 失效。hard-nav 到 /login(带 redirect),
      // 重载后 useSession 重新求值 -> session=null -> /login 显示(P0 beforeLoad 不会弹回 /dashboard),无循环。
      // 用 window.location 而非 router:api 层按边界不依赖 lib/router,且 hard-nav 天然清内存态、loop-safe。
      if (res.status === 401) {
        const back = window.location.pathname + window.location.search;
        window.location.assign(`/login?redirect=${encodeURIComponent(back)}`);
        throw new Error("登录已过期");
      }
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        throw new Error(json.message || "请求失败");
      }
      return json.data;
    },
  },
});

// 缓存策略(见 docs/conventions/frontend/state-cache.md):cacheFor/hitSource/name 集中在此(method 级策略,
// createApis 把 configMap[key] merge 进每次调用)。loader/hooks 调 Apis.xxx() 不再传 cacheFor,单一来源。
// GET 标 cacheFor + hitSource,mutation 标 name;mutation 成功自动失效相关 GET 缓存。
export const $$userConfigMap = withConfigType({
  // Me.getMe:权限变更(授/撤角色、授/撤直接权限、角色权限变更)后失效缓存,下次 beforeLoad
  // (刷新/重进 _authenticated)拿新权限。无差别 hitSource:给别人授权也失效自己 Me(多一次
  // 重拉,无害)。限制:SPA 内不刷新则 context.auth.permissions 不即时更新(需 router.invalidate
  // 重跑 beforeLoad,留待后续)。
  "Me.getMe": {
    cacheFor: 5 * 60_000,
    hitSource: [
      "IAM.assignUserRole",
      "IAM.deleteUserRole",
      "IAM.assignUserPermission",
      "IAM.deleteUserPermission",
      "IAM.assignRolePermissions",
      "IAM.deleteRolePermission",
    ],
  },
  "IAM.listRoles": {
    cacheFor: 60_000,
    hitSource: ["IAM.createRole", "IAM.updateRole", "IAM.deleteRole"],
  },
  "IAM.listPermissions": { cacheFor: 10 * 60_000 },
  "IAM.listRolePermissions": {
    hitSource: ["IAM.assignRolePermissions", "IAM.deleteRolePermission"],
  },
  "IAM.listOrganizations": {
    cacheFor: 60_000,
    hitSource: ["IAM.createOrganization", "IAM.updateOrganization", "IAM.deleteOrganization"],
  },
  // 用户列表:创建/改资料/禁用·启用后失效(reset 不改列表字段,不进 hitSource)
  "IAM.listUsers": {
    cacheFor: 60_000,
    hitSource: ["IAM.createUser", "IAM.updateUser", "IAM.disableUser", "IAM.enableUser"],
  },
  // 用户授权:撤销/授予后有效权限全集需自动失效(此前靠手动 send)。
  // 角色权限变更(assignRolePermissions/deleteRolePermission)也影响用户有效权限
  // (角色->权限->用户链路),故一并纳入 hitSource(B5 D3,对齐 listRolePermissions)。
  "IAM.listUserPermissions": {
    cacheFor: 60_000,
    hitSource: [
      "IAM.assignUserRole",
      "IAM.deleteUserRole",
      "IAM.assignUserPermission",
      "IAM.deleteUserPermission",
      "IAM.assignRolePermissions",
      "IAM.deleteRolePermission",
    ],
  },
  // 新端点:某组织直接授予的原始记录,撤销后自动失效
  "IAM.listUserRoles": {
    cacheFor: 60_000,
    hitSource: ["IAM.assignUserRole", "IAM.deleteUserRole"],
  },
  "IAM.listUserDirectPermissions": {
    cacheFor: 60_000,
    hitSource: ["IAM.assignUserPermission", "IAM.deleteUserPermission"],
  },
  "Settings.listSettings": {
    cacheFor: 60_000,
    hitSource: ["Settings.updateSetting"],
  },
  "Projects.listProjects": {
    cacheFor: 60_000,
    hitSource: ["Projects.createProject", "Projects.updateProject", "Projects.deleteProject"],
  },
  "Projects.createProject": { name: "Projects.createProject" },
  "Projects.updateProject": { name: "Projects.updateProject" },
  "Projects.deleteProject": { name: "Projects.deleteProject" },
  "IAM.createRole": { name: "IAM.createRole" },
  "IAM.updateRole": { name: "IAM.updateRole" },
  "IAM.deleteRole": { name: "IAM.deleteRole" },
  "IAM.assignRolePermissions": { name: "IAM.assignRolePermissions" },
  "IAM.deleteRolePermission": { name: "IAM.deleteRolePermission" },
  "IAM.createOrganization": { name: "IAM.createOrganization" },
  "IAM.updateOrganization": { name: "IAM.updateOrganization" },
  "IAM.deleteOrganization": { name: "IAM.deleteOrganization" },
  "IAM.assignUserRole": { name: "IAM.assignUserRole" },
  "IAM.deleteUserRole": { name: "IAM.deleteUserRole" },
  "IAM.assignUserPermission": { name: "IAM.assignUserPermission" },
  "IAM.deleteUserPermission": { name: "IAM.deleteUserPermission" },
  "IAM.createUser": { name: "IAM.createUser" },
  "IAM.updateUser": { name: "IAM.updateUser" },
  "IAM.resetUserPassword": { name: "IAM.resetUserPassword" },
  "IAM.disableUser": { name: "IAM.disableUser" },
  "IAM.enableUser": { name: "IAM.enableUser" },
  "Settings.updateSetting": { name: "Settings.updateSetting" },
});

const Apis = createApis(alovaInstance, $$userConfigMap);

mountApis(Apis);

export default Apis;
