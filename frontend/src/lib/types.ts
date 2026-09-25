// Mirrors docs/CONTRACT.md exactly. Do not diverge without updating both.

export type Participant = {
  id: number;
  name: string;
  email: string | null;
};

export type Summary = {
  overview: string; // 1-3 paragraphs, separated by "\n\n"
  keywords: string[];
  generated_by: "seed" | "llm" | "heuristic";
};

export type Chapter = {
  id: number;
  title: string;
  start_sec: number;
};

export type ActionItem = {
  id: number;
  meeting_id: number;
  text: string;
  completed: boolean;
  assignee: Participant | null;
  segment_id: number | null;
  start_sec: number | null;
  created_at: string;
};

export type Segment = {
  id: number;
  idx: number;
  speaker_label: string;
  speaker_participant_id: number | null;
  start_sec: number;
  end_sec: number;
  text: string;
};

export type MeetingSource = "seed" | "upload" | "form";

export type MeetingListItem = {
  id: number;
  title: string;
  date: string;
  duration_sec: number;
  source: MeetingSource;
  participants: Participant[];
  summary_snippet: string | null;
  open_action_items: number;
};

export type MeetingDetail = Omit<
  MeetingListItem,
  "summary_snippet" | "open_action_items"
> & {
  summary: Summary | null;
  chapters: Chapter[];
  action_items: ActionItem[];
};

export type SearchHit = {
  meeting_id: number;
  meeting_title: string;
  meeting_date: string;
  segment_id: number;
  start_sec: number;
  speaker_label: string;
  text: string;
};

export type MeetingSort = "recent" | "oldest";

export type MeetingFiltersQuery = {
  q?: string;
  participant_id?: number;
  date_from?: string;
  date_to?: string;
  sort?: MeetingSort;
};

export type CreateMeetingPayload = {
  title: string;
  date?: string;
  participants?: string[];
  transcript_text: string;
};

export type UpdateMeetingPayload = {
  title?: string;
  participants?: string[];
};

export type CreateActionItemPayload = {
  text: string;
  assignee_name?: string | null;
};

export type UpdateActionItemPayload = {
  text?: string;
  completed?: boolean;
  assignee_name?: string | null;
};
