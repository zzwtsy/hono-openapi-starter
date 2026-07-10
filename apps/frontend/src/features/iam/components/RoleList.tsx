import { useRoles } from "../hooks";

export function RoleList() {
  const { data, loading, error } = useRoles();
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
