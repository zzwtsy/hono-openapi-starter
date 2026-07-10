import { useProjects } from "../hooks";

export function ProjectList() {
  const { data, loading, error } = useProjects();
  if (loading) {
    return <p className="text-muted-foreground">加载中...</p>;
  }
  if (error) {
    return <p className="text-red-500">加载失败</p>;
  }
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {data?.map(project => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
