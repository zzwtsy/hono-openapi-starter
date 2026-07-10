import { useRequest } from "alova/client";
import { iamApi } from "./api";

export function useRoles() {
  return useRequest(() => iamApi.listRoles());
}
