import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { requirePermission } from "@/lib/require-permission";
import { SettingsPage } from "@/pages/settings";

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "settings.read");
  },
  loader: async () => {
    await Apis.Settings.listSettings();
  },
  component: SettingsPage,
});
