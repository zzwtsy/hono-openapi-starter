import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogTable } from "@/features/audit/components/audit-log-table";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/audit/")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "audit.read");
  },
  loader: async () => {
    await Apis.Audit.listAuditActions();
  },
  component: Audit,
});

function Audit() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <PageHeader title="操作日志" description="系统操作审计记录。" />
      <AuditLogTable />
    </div>
  );
}
