import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/dashboard/components/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});
