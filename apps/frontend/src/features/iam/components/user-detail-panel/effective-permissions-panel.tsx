import type { UserAccessQueryState } from "../../hooks/use-user-access-data";
import type { PermissionSource, UserPermissionsResult } from "@/api/globals";
import { format } from "date-fns";
import { CircleAlert, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/hooks/use-permissions";

interface EffectivePermissionsPanelProps {
  query: UserAccessQueryState<UserPermissionsResult>;
  getOrgPath: (orgId: string) => string;
  onNavigateRole: (roleId: string, orgId?: string) => void;
  onOrgIdChange: (orgId: string) => void;
}

function SourceLine({ source, getOrgPath, onNavigateRole, onOrgIdChange, canReadRole, canReadOrg }: {
  source: PermissionSource;
  getOrgPath: (orgId: string) => string;
  onNavigateRole: (roleId: string, orgId?: string) => void;
  onOrgIdChange: (orgId: string) => void;
  canReadRole: boolean;
  canReadOrg: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="min-w-0 whitespace-normal text-muted-foreground">
        {source.type === "role" ? `角色：${source.roleName ?? "未知角色"}` : "直接允许"}
        {" · "}
        {getOrgPath(source.orgId)}
        {source.expiresAt !== null ? ` · 至 ${format(new Date(source.expiresAt), "yyyy-MM-dd")}` : ""}
      </span>
      {source.type === "role" && source.roleId !== null && canReadRole && (
        <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => { onNavigateRole(source.roleId!, source.orgId); }}>查看角色</Button>
      )}
      {canReadOrg && (
        <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => { onOrgIdChange(source.orgId); }}>切换到此组织视角</Button>
      )}
    </div>
  );
}

function PermissionSources({ sources, getOrgPath, onNavigateRole, onOrgIdChange, canReadRole, canReadOrg }: {
  sources: PermissionSource[];
  getOrgPath: (orgId: string) => string;
  onNavigateRole: (roleId: string, orgId?: string) => void;
  onOrgIdChange: (orgId: string) => void;
  canReadRole: boolean;
  canReadOrg: boolean;
}) {
  if (sources.length <= 1) {
    const source = sources[0];
    return source === undefined ? <span className="text-muted-foreground">无来源信息</span> : <SourceLine source={source} getOrgPath={getOrgPath} onNavigateRole={onNavigateRole} onOrgIdChange={onOrgIdChange} canReadRole={canReadRole} canReadOrg={canReadOrg} />;
  }
  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
        {sources.length}
        {" "}
        个来源
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
        <PopoverHeader><PopoverTitle>权限来源</PopoverTitle></PopoverHeader>
        <div className="flex flex-col gap-2">
          {sources.map(source => (
            <SourceLine key={`${source.type}-${source.roleId ?? "direct"}-${source.orgId}-${source.expiresAt ?? "permanent"}`} source={source} getOrgPath={getOrgPath} onNavigateRole={onNavigateRole} onOrgIdChange={onOrgIdChange} canReadRole={canReadRole} canReadOrg={canReadOrg} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EffectivePermissionsPanel({ query, getOrgPath, onNavigateRole, onOrgIdChange }: EffectivePermissionsPanelProps) {
  const canReadRoles = useCan("roles.read");
  const canReadOrgs = useCan("organizations.read");

  if (query.error != null && query.data === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取用户的生效权限。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={query.retry}>重试</Button>
      </div>
    );
  }
  if (query.loading && query.data === undefined)
    return <Skeleton className="h-40 w-full" />;

  const effective = query.data?.effective ?? [];
  const denied = query.data?.denied ?? [];
  const sourcesProps = { getOrgPath, onNavigateRole, onOrgIdChange, canReadRole: canReadRoles, canReadOrg: canReadOrgs };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="effective-permissions-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="effective-permissions-title" className="text-sm font-semibold">当前生效权限</h3>
          <Badge variant="secondary">
            {effective.length}
            {" "}
            项
          </Badge>
        </div>
        {effective.length === 0
          ? (
              <Empty className="min-h-24 p-4">
                <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>暂无生效权限</EmptyTitle>
                  <EmptyDescription>该用户在此组织下没有有效权限。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <Table className="min-w-2xl table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">权限</TableHead>
                    <TableHead className="w-[22%]">资源</TableHead>
                    <TableHead>来源</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {effective.map(item => (
                    <TableRow key={item.permission.code}>
                      <TableCell className="whitespace-normal font-medium">{item.permission.label}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{item.permission.resourceLabel}</TableCell>
                      <TableCell className="whitespace-normal"><PermissionSources sources={item.sources} {...sourcesProps} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="denied-permissions-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="denied-permissions-title" className="text-sm font-semibold">被拒绝权限</h3>
          <Badge variant="secondary">
            {denied.length}
            {" "}
            项
          </Badge>
        </div>
        {denied.length === 0
          ? <Empty className="min-h-16 p-3"><EmptyHeader><EmptyTitle>没有被拒绝的权限</EmptyTitle></EmptyHeader></Empty>
          : (
              <Table className="min-w-3xl table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[24%]">权限</TableHead>
                    <TableHead>被抑制来源</TableHead>
                    <TableHead className="w-[28%]">拒绝来源</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {denied.map(item => (
                    <TableRow key={item.permission.code}>
                      <TableCell className="whitespace-normal">
                        <span className="font-medium line-through">{item.permission.label}</span>
                        <Badge variant="destructive" className="ml-2">已拒绝</Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal"><PermissionSources sources={item.suppressedSources} {...sourcesProps} /></TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {item.deniedBy.map(source => `${getOrgPath(source.orgId)}${source.expiresAt !== null ? `（至 ${format(new Date(source.expiresAt), "yyyy-MM-dd")}）` : ""}`).join("、")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
      </section>
    </div>
  );
}
