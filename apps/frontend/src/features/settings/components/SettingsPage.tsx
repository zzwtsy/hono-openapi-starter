import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 系统设置页:当前无内置配置项(signUp 注册开关已随「移除自助注册」退役,见 ADR-0007)。
 * system_settings API 与表保留,后续新增运行时配置时在此加 UI。
 * settings.update 权限已定义但待 UI 启用(本期不动后端,权限保留为预留)。
 */
export function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>系统设置</CardTitle>
        <CardDescription>当前暂无可配置项。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">后续新增的系统配置将显示在此处。</p>
      </CardContent>
    </Card>
  );
}
