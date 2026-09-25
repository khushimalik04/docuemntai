import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function IntegrationsPage() {
  return (
    <ComingSoon
      icon={Plug}
      title="Integrations"
      description="Connect your calendar, Zoom, Google Meet and CRM so meeting notes flow automatically into the tools your team already uses."
    />
  );
}
