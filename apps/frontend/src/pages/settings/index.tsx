import { PageHeader } from "@/components/shared/page-header";
import { SettingsPage as SettingsView } from "@/features/settings/ui/settings-page";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="系统设置" description="运行时可编辑的配置项。" />
      <SettingsView />
    </div>
  );
}
