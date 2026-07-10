import { useRequest } from "alova/client";
import { projectsApi } from "./api";

export function useProjects() {
  return useRequest(() => projectsApi.listProjects());
}
