import { MeetingDetailClient } from "./MeetingDetailClient";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingDetailClient meetingId={Number(id)} />;
}
