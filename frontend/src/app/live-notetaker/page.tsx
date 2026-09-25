import { Radio } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function LiveNotetakerPage() {
  return (
    <ComingSoon
      icon={Radio}
      title="Live Notetaker"
      description="A bot that joins your Zoom and Google Meet calls and takes notes automatically, in real time."
    />
  );
}
