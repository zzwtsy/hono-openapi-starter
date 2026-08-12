import type { AuditSearch } from "@/features/audit/lib/audit-search";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogTable } from "@/features/audit/components/audit-log-table";
import {
  parseAuditSearchActions,
  parseAuditSearchDateRange,
  parseAuditSearchPage,
  parseAuditSearchPageSize,
} from "@/features/audit/lib/audit-search";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/audit/")({
  validateSearch: (search: Record<string, unknown>): AuditSearch => {
    const range = parseAuditSearchDateRange(search.from, search.to);
    return {
      page: parseAuditSearchPage(search.page),
      pageSize: parseAuditSearchPageSize(search.pageSize),
      actions: parseAuditSearchActions(search.actions),
      status: search.status === "success" || search.status === "failure" ? search.status : undefined,
      actorKeyword: typeof search.actorKeyword === "string" ? search.actorKeyword : undefined,
      ...range,
    };
  },
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissionCodes, "audit.read");
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
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden p-6">
      <PageHeader title="操作日志" description="系统操作审计记录。" />
      <AuditLogTable search={search} onSearchChange={handleSearchChange} />
    </div>
  );
}
