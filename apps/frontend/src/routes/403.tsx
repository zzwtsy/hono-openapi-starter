import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/403")({
  component: () => (
    <div className="p-6">
      <h1 className="font-medium">403</h1>
      <p className="text-muted-foreground">无权限访问。</p>
    </div>
  ),
});
