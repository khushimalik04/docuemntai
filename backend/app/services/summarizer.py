"""Produce a Summary + chapters + action items for a transcript.

Uses the Anthropic API when a key is configured, otherwise falls back to a
deterministic heuristic. Any LLM failure (network, bad JSON, etc.) also falls
back to the heuristic so the app never breaks because of the optional key.
"""
import json
import re
from collections import Counter

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "then", "so", "to", "of", "in",
    "on", "for", "with", "at", "by", "from", "up", "about", "into", "over",
    "after", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "will", "would", "could", "should", "can",
    "this", "that", "these", "those", "it", "its", "i", "you", "he", "she",
    "we", "they", "them", "my", "your", "our", "their", "me", "him", "her",
    "us", "not", "no", "yes", "just", "like", "get", "got", "think", "know",
    "going", "gonna", "want", "need", "okay", "ok", "yeah", "well", "also",
    "as", "there", "here", "what", "when", "where", "how", "why", "who",
    "all", "some", "one", "two", "out", "up", "down", "than", "very", "really",
    # conversational filler that shows up a lot in meetings but says nothing
    "through", "sure", "great", "good", "right", "thanks", "thank", "morning",
    "too", "let's", "i'll", "i'm", "we're", "it's", "that's", "don't", "can't",
    "you're", "they're", "there's", "actually", "maybe", "something", "things",
    "thing", "lot", "bit", "kind", "sort", "said", "say", "see", "look", "mean",
    "make", "sounds", "again", "still", "more", "much", "any", "only", "which",
}

ACTION_PATTERNS = re.compile(
    r"\b(i'?ll|i will|we need to|can you|let'?s|action item|follow up|"
    r"by friday|by tomorrow|by next week)\b",
    re.IGNORECASE,
)


def _keywords_from_text(text: str, top_n: int = 8, exclude: set[str] | None = None) -> list[str]:
    words = re.findall(r"[a-zA-Z']+", text.lower())
    skip = STOPWORDS | (exclude or set())
    words = [w for w in words if w not in skip and len(w) >= 3]
    counts = Counter(words)
    return [word for word, _ in counts.most_common(top_n)]


def _heuristic_overview(segments: list[dict], participants: list[str]) -> str:
    if not segments:
        return "No transcript content was recorded for this meeting."

    minutes = round(segments[-1]["end"] / 60)
    length = "under a minute" if minutes < 1 else f"about {minutes} minute{'s' if minutes != 1 else ''}"
    if len(participants) > 1:
        intro = f"This meeting involved {', '.join(participants[:-1])} and {participants[-1]}."
    elif participants:
        intro = f"This meeting involved {participants[0]}."
    else:
        intro = "This meeting was recorded with an unspecified set of participants."
    stats = f"It ran for {length} across {len(segments)} transcript segments."

    substantive = [s["text"] for s in segments if len(s["text"].split()) >= 6][:3]
    overview = f"{intro} {stats}"
    if substantive:
        overview += "\n\n" + " ".join(substantive)
    return overview


def _heuristic_chapters(segments: list[dict]) -> list[dict]:
    if not segments:
        return []

    num_chapters = min(6, max(4, len(segments) // 5)) if len(segments) >= 4 else len(segments)
    num_chapters = max(1, num_chapters)
    chunk_size = max(1, len(segments) // num_chapters)

    chapters = []
    for i in range(0, len(segments), chunk_size):
        chunk = segments[i : i + chunk_size]
        if not chunk:
            continue
        chunk_text = " ".join(s["text"] for s in chunk)
        top_words = _keywords_from_text(chunk_text, top_n=3)
        title = " ".join(w.title() for w in top_words) if top_words else f"Segment {len(chapters) + 1}"
        chapters.append({"title": title, "start_sec": chunk[0]["start"]})
        if len(chapters) >= num_chapters:
            break
    return chapters


def _heuristic_action_items(segments: list[dict]) -> list[dict]:
    items = []
    for seg in segments:
        if ACTION_PATTERNS.search(seg["text"]):
            items.append({"text": seg["text"], "assignee": seg["speaker"], "start_sec": seg["start"]})
    return items


def heuristic_summarize(segments: list[dict], participants: list[str]) -> dict:
    all_text = " ".join(s["text"] for s in segments)
    # People's names are frequent in transcripts but make poor keywords.
    name_words = {w.lower() for name in participants for w in name.split()}
    return {
        "overview": _heuristic_overview(segments, participants),
        "keywords": _keywords_from_text(all_text, exclude=name_words) or ["meeting"],
        "chapters": _heuristic_chapters(segments),
        "action_items": _heuristic_action_items(segments),
        "generated_by": "heuristic",
    }


def _format_transcript_for_llm(segments: list[dict], max_chars: int = 12000) -> str:
    lines = []
    for s in segments:
        minutes, seconds = divmod(int(s["start"]), 60)
        lines.append(f"[{minutes:02d}:{seconds:02d}] {s['speaker']}: {s['text']}")
    transcript = "\n".join(lines)
    return transcript[:max_chars]


def llm_summarize(segments: list[dict], participants: list[str], api_key: str, model: str) -> dict:
    import anthropic  # imported lazily so the app runs without the package configured

    transcript = _format_transcript_for_llm(segments)
    prompt = f"""Summarize this meeting transcript. Participants: {', '.join(participants) or 'unknown'}.

Transcript:
{transcript}

Respond with ONLY strict JSON, no markdown fences, matching this shape exactly:
{{
  "overview": "1-3 paragraphs, plain text, paragraphs separated by \\n\\n",
  "keywords": ["4-10 short keywords"],
  "chapters": [{{"title": "Title Case chapter name", "start_sec": 0}}],
  "action_items": [{{"text": "...", "assignee": "participant name or null", "start_sec": 0}}]
}}"""

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw_text = response.content[0].text.strip()
    # Strip accidental markdown fences just in case the model adds them.
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text

    data = json.loads(raw_text)
    return {
        "overview": data["overview"],
        "keywords": list(data["keywords"]),
        "chapters": [{"title": c["title"], "start_sec": float(c["start_sec"])} for c in data["chapters"]],
        "action_items": [
            {
                "text": ai["text"],
                "assignee": ai.get("assignee"),
                "start_sec": float(ai["start_sec"]) if ai.get("start_sec") is not None else None,
            }
            for ai in data["action_items"]
        ],
        "generated_by": "llm",
    }


def summarize(
    segments: list[dict],
    participants: list[str],
    api_key: str | None = None,
    model: str | None = None,
) -> dict:
    if api_key:
        try:
            return llm_summarize(segments, participants, api_key, model)
        except Exception:
            pass  # fall through to heuristic on any LLM failure
    return heuristic_summarize(segments, participants)
