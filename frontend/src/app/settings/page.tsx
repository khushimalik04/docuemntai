import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description="Manage your profile, notification preferences and workspace configuration."
    />
  );
}
