import type { MyAuthorization, PermissionSource, UserDirectPermission, UserRoleAssignment } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { format } from "date-fns";
import { CalendarClock, CircleAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { AUTHORIZATION_ACTION } from "@/lib/action-keys";

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const expirationTime = expiresAt === null ? null : new Date(expiresAt).getTime();

  useEffect(() => {
    if (expirationTime === null || !Number.isFinite(expirationTime) || expirationTime <= Date.now()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      // 过期时重新渲染，让徽章从“至某日”切换为“已过期”。
      setNow(Date.now());
    }, expirationTime - Date.now() + 1);

    return () => window.clearTimeout(timeout);
  }, [expirationTime]);

  if (expiresAt === null) {
    return <Badge variant="outline">永久</Badge>;
  }

  const expired = new Date(expiresAt).getTime() <= now;
  return (
    <Badge variant={expired ? "destructive" : "outline"} className="gap-1">
      <CalendarClock />
      {expired ? "已过期" : `至 ${format(new Date(expiresAt), "yyyy-MM-dd")}`}
    </Badge>
  );
}

function GrantMeta({ orgId, expiresAt }: { orgId: string; expiresAt: string | null }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>
        授权组织 @
        {orgId}
      </span>
      <ExpiryBadge expiresAt={expiresAt} />
    </span>
  );
}

function RoleGrant({ grant }: { grant: UserRoleAssignment }) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>{grant.roleName}</ItemTitle>
        <ItemDescription>
          <GrantMeta orgId={grant.orgId} expiresAt={grant.expiresAt} />
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function DirectGrant({ grant }: { grant: UserDirectPermission }) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle className="flex-wrap">
          {grant.permission.label}
          <Badge variant={grant.effect === "deny" ? "destructive" : "secondary"}>
            {grant.effect === "deny" ? "拒绝" : "允许"}
          </Badge>
        </ItemTitle>
        <ItemDescription>
          <GrantMeta orgId={grant.orgId} expiresAt={grant.expiresAt} />
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function SourceList({ sources }: { sources: PermissionSource[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {sources.map(source => (
        <span key={`${source.type}-${source.roleId ?? "direct"}-${source.orgId}-${source.expiresAt ?? "permanent"}`} className="inline-flex items-center gap-1.5">
          <Badge variant="secondary">{source.type === "role" ? (source.roleName ?? "角色") : "直接"}</Badge>
          <span className="text-xs text-muted-foreground">
            @
            {source.orgId}
          </span>
          <ExpiryBadge expiresAt={source.expiresAt} />
        </span>
      ))}
    </span>
  );
}

function GrantListEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="min-h-24 p-4">
      <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function AuthorizationContent({ authorization }: { authorization: MyAuthorization }) {
  const { roles, directPermissions, effective } = authorization;

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>授权概览</CardTitle>
          <CardDescription>有效权限只按当前 Home org 计算；原始授权会包含祖先组织，便于核对继承来源。</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Home org</dt>
              <dd className="mt-1 font-medium">{authorization.orgId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">有效权限</dt>
              <dd className="mt-1 font-medium">{effective.effective.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">被 deny 抵消</dt>
              <dd className="mt-1 font-medium">{effective.denied.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>角色授权</CardTitle>
            <CardDescription>Home org 及祖先组织授予的角色，包括已过期记录。</CardDescription>
          </CardHeader>
          <CardContent>
            {roles.length === 0
              ? <GrantListEmpty title="暂无角色授权" description="当前没有可核对的角色来源。" />
              : <ItemGroup>{roles.map(role => <RoleGrant key={`${role.roleId}-${role.orgId}`} grant={role} />)}</ItemGroup>}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>直接授权</CardTitle>
            <CardDescription>直接 allow/deny 记录，包括已过期记录。</CardDescription>
          </CardHeader>
          <CardContent>
            {directPermissions.length === 0
              ? <GrantListEmpty title="暂无直接授权" description="当前没有直接 allow 或 deny。" />
              : <ItemGroup>{directPermissions.map(grant => <DirectGrant key={`${grant.permission.code}-${grant.orgId}`} grant={grant} />)}</ItemGroup>}
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>有效权限来源</CardTitle>
          <CardDescription>以下权限当前生效，并列出角色或直接授权的来源链。</CardDescription>
        </CardHeader>
        <CardContent>
          {effective.effective.length === 0
            ? <GrantListEmpty title="暂无有效权限" description="当前 Home org 下没有生效权限。" />
            : (
                <ItemGroup>
                  {effective.effective.map(item => (
                    <Item key={item.permission.code} variant="outline" size="sm">
                      <ItemContent>
                        <ItemTitle>{item.permission.label}</ItemTitle>
                        <ItemDescription><SourceList sources={item.sources} /></ItemDescription>
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              )}
        </CardContent>
      </Card>

      {effective.denied.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>被 deny 抵消</CardTitle>
            <CardDescription>这些权限本会生效，但被直接 deny 从结果中扣除。</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup>
              {effective.denied.map(item => (
                <Item key={item.permission.code} variant="outline" size="sm">
                  <ItemContent>
                    <ItemTitle className="flex-wrap">
                      <span className="line-through text-muted-foreground">{item.permission.label}</span>
                      <Badge variant="destructive">已拒绝</Badge>
                    </ItemTitle>
                    <ItemDescription className="flex flex-col gap-1.5">
                      <SourceList sources={item.suppressedSources} />
                      <span>
                        拒绝来源：
                        {item.deniedBy.map(source => `@${source.orgId}`).join("、")}
                      </span>
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AuthorizationPanel() {
  const {
    data: authorization,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.getMyAuthorization(),
    { immediate: true, middleware: actionDelegationMiddleware(AUTHORIZATION_ACTION) },
  );

  if (loading && authorization === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error !== null && authorization === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取你的授权来源。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>重试</Button>
      </div>
    );
  }

  if (authorization === undefined) {
    return null;
  }

  return <AuthorizationContent authorization={authorization} />;
}
