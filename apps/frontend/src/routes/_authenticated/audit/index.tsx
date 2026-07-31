import type { AuditSearch } from "@/features/audit/lib/audit-search";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogTable } from "@/features/audit/components/audit-log-table";
import { requirePermission } from "@/lib/require-permission";

function parsePage(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
}

function parsePageSize(value: unknown): number | undefined {
  const n = parsePage(value);
  return n != null && n <= 100 ? n : undefined;
}

export const Route = createFileRoute("/_authenticated/audit/")({
  validateSearch: (search: Record<string, unknown>): AuditSearch => ({
    page: parsePage(search.page),
    pageSize: parsePageSize(search.pageSize),
    action: typeof search.action === "string" ? search.action : undefined,
    status: search.status === "success" || search.status === "failure" ? search.status : undefined,
    actorKeyword: typeof search.actorKeyword === "string" ? search.actorKeyword : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "audit.read");
  },
  component: Audit,
});

function Audit() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  /** 更新筛选/分页(search 唯一状态源;replace 不污染历史;非分页变更重置 page)。 */
  const handleSearchChange = (patch: Partial<AuditSearch>) => {
    void navigate({
      replace: true,
      search: (prev) => {
        const isPaging = patch.page !== undefined || patch.pageSize !== undefined;
        return {
          ...prev,
          ...patch,
          ...(isPaging ? {} : { page: undefined }),
        };
      },
    });
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <PageHeader title="操作日志" description="系统操作审计记录。" />
      <AuditLogTable search={search} onSearchChange={handleSearchChange} />
    </div>
  );
}
