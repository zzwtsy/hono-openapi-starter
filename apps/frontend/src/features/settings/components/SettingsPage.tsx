import { useRequest } from "alova/client";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCan } from "@/hooks/use-permissions";

/**
 * 系统设置页:本期仅 signUp 注册开关。
 * 列表命中 loader cache;无 signUp 记录时按「关闭」展示(与后端未配置即禁一致)。
 * 仅 settings.update 可改 Switch;无权限只读。
 */
export function SettingsPage() {
  const canUpdate = useCan("settings.update");
  const { data: settings, loading, error, send } = useRequest(() => Apis.Settings.listSettings());
  const [pending, setPending] = useState(false);

  if (loading && settings === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error !== null && settings === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取系统设置。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>
          重试
        </Button>
      </div>
    );
  }

  const signUp = settings?.find(s => s.key === "signUp");
  // 未配置按关闭展示(与 hooks.before 未配置即禁一致)
  const enabled = signUp?.value.enabled === true;

  const onToggle = async (next: boolean) => {
    if (!canUpdate || pending) {
      return;
    }
    setPending(true);
    try {
      await Apis.Settings.updateSetting({
        pathParams: { key: "signUp" },
        data: { value: { enabled: next } },
      });
      toast.success(next ? "已开启用户注册" : "已关闭用户注册");
      await send();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>用户注册</CardTitle>
        <CardDescription>
          控制是否允许通过公开注册页自助创建账号。关闭后注册请求将被拒绝。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">允许用户自助注册</span>
            <span className="text-sm text-muted-foreground">
              {enabled ? "当前已开启" : "当前已关闭"}
              {!canUpdate && "（只读）"}
            </span>
          </div>
          <Switch
            checked={enabled}
            disabled={!canUpdate || pending}
            onCheckedChange={(checked) => {
              void onToggle(checked);
            }}
            aria-label="允许用户自助注册"
          />
        </div>
      </CardContent>
    </Card>
  );
}
