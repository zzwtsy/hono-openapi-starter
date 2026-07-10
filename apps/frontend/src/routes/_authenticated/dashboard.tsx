import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="font-medium">Dashboard</h1>
      <p className="text-muted-foreground">概览页待实现。</p>
    </div>
  );
}
