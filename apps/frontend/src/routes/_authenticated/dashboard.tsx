import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="Dashboard" description="概览页待实现。" />
    </div>
  );
}
