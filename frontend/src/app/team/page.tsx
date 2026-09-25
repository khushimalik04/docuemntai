import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function TeamPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Team"
      description="Invite teammates, share meetings and manage workspace roles from one place."
    />
  );
}
