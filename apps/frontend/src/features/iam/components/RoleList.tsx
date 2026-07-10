import { useRequest } from "alova/client";
import Apis from "@/api";

export function RoleList() {
  const { data, loading, error } = useRequest(() => Apis.IAM.listRoles(), { cacheFor: 60_000 });
  if (loading) {
    return <p className="text-muted-foreground">加载中...</p>;
  }
  if (error) {
    return <p className="text-red-500">加载失败</p>;
  }
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {data?.map(role => (
        <li key={role.id}>{role.name}</li>
      ))}
    </ul>
  );
}
