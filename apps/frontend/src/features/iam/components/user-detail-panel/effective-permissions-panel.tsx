import type { PermissionSource } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { format } from "date-fns";
import { CalendarClock, CircleAlert, KeyRound } from "lucide-react";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IAM_ACTIONS } from "../../iam-actions";
import { groupByResource } from "../shared/group-by-resource";

function SourceBadge({ source, getOrgPath, onNavigateRole, onOrgIdChange }: {
  source: PermissionSource;
  getOrgPath: (orgId: string) => string;
  onNavigateRole: (roleId: string) => void;
  onOrgIdChange: (orgId: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {source.type === "role"
        ? (
            <Tooltip>
              <TooltipTrigger render={
                <Badge variant="secondary" className="text-xs hover:bg-accent" />
              }
              >
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => { onNavigateRole(source.roleId!); }}
                >
                  {source.roleName}
                </button>
              </TooltipTrigger>
              <TooltipContent>查看角色详情</TooltipContent>
            </Tooltip>
          )
        : <Badge variant="secondary" className="text-xs">直接</Badge>}
      <Tooltip>
        <TooltipTrigger render={
          <Badge variant="outline" className="text-xs text-muted-foreground hover:bg-accent" />
        }
        >
          <button
            type="button"
            className="cursor-pointer"
            onClick={() => { onOrgIdChange(source.orgId); }}
          >
            @
            {getOrgPath(source.orgId)}
          </button>
        </TooltipTrigger>
        <TooltipContent>切到此组织视角</TooltipContent>
      </Tooltip>
      {source.expiresAt != null && (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3" />
          {format(new Date(source.expiresAt), "yyyy-MM-dd")}
        </span>
      )}
    </span>
  );
}

interface EffectivePermissionsPanelProps {
  userId: string;
  orgId: string;
  getOrgPath: (orgId: string) => string;
  onNavigateRole: (roleId: string) => void;
  onOrgIdChange: (orgId: string) => void;
}

/**
 * 有效权限面板:后端 listUserPermissions 直接返回带来源链的结构
 * (effective + denied),无需前端 N+1 拼。来源 badge 可点击跳转。
 */
export function EffectivePermissionsPanel({ userId, orgId, getOrgPath, onNavigateRole, onOrgIdChange }: EffectivePermissionsPanelProps) {
  const {
    data: result,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.listUserPermissions({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userPermissions) },
  );

  if (error !== null && result === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取用户权限。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>重试</Button>
      </div>
    );
  }
  if (loading && result === undefined) {
    return <Skeleton className="h-20 w-full" />;
  }

  const effective = result?.effective ?? [];
  const denied = result?.denied ?? [];
  const groups = groupByResource(effective, p => p.permission);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">有效权限</h4>
        {effective.length === 0
          ? (
              <Empty>
                <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>暂无权限</EmptyTitle>
                  <EmptyDescription>该用户在此组织下没有有效权限。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <div className="flex flex-col gap-3">
                {[...groups.entries()].map(([resource, perms]) => (
                  <div key={resource} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{resource}</span>
                    <div className="flex flex-col gap-1.5">
                      {perms.map(p => (
                        <div key={p.permission} className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span>{p.permission}</span>
                          {p.sources.map(s => (
                            <SourceBadge
                              key={`${s.type}-${s.roleId ?? "direct"}-${s.orgId}`}
                              source={s}
                              getOrgPath={getOrgPath}
                              onNavigateRole={onNavigateRole}
                              onOrgIdChange={onOrgIdChange}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      {denied.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-muted-foreground">已被拒绝(deny 抵消)</h4>
            <p className="text-xs text-muted-foreground">以下权限本会生效,但被直接 deny 扣掉。撤销对应 deny 可恢复。</p>
            <div className="flex flex-col gap-1.5">
              {denied.map(d => (
                <div key={d.permission} className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground line-through">{d.permission}</span>
                  <Badge variant="destructive" className="text-xs">已被拒绝</Badge>
                  {d.suppressedSources.map(s => (
                    <SourceBadge
                      key={`denied-${s.type}-${s.roleId ?? "direct"}-${s.orgId}`}
                      source={s}
                      getOrgPath={getOrgPath}
                      onNavigateRole={onNavigateRole}
                      onOrgIdChange={onOrgIdChange}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground">
                    被
                    {" "}
                    {d.deniedBy.map(d => getOrgPath(d.orgId)).join("、")}
                    {" "}
                    拒绝
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
