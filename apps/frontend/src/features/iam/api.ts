import Apis from "@/api";

// 封装 iam 相关端点(垂直切片能力层),供 hooks/components 使用。
export const iamApi = {
  listRoles: () => Apis.IAM.listRoles(),
  createRole: (name: string, description?: string) =>
    Apis.IAM.createRole({ data: { name, description } }),
  listPermissions: () => Apis.IAM.listPermissions(),
};
