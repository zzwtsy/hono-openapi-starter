import Apis from "@/api";

// 封装 projects 相关端点(垂直切片能力层)。
export const projectsApi = {
  listProjects: () => Apis.Projects.listProjects(),
  getProjectById: (projectId: string) =>
    Apis.Projects.getProjectById({ pathParams: { projectId } }),
};
