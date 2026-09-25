import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Analytics"
      description="See talk-time ratios, meeting trends and action item completion across your team over time."
    />
  );
}
