"""Turn raw transcript text (txt / vtt / json) into a plain list of segments.

Pure functions only -- no DB access here. Each parser returns a list of dicts:
{"speaker": str, "start": float, "end": float, "text": str}
"""
import json
import re
from dataclasses import dataclass
from typing import Optional, List, Tuple, Dict, Any

WORDS_PER_MINUTE = 150

TS_BRACKET = re.compile(r"^\[(\d{1,3}(?::\d{2}){1,2})\]\s*(.*)$")
TS_PLAIN = re.compile(r"^(\d{1,3}(?::\d{2}){1,2})\s+(.*)$")
SPEAKER_RE = re.compile(r"^([A-Za-z0-9][A-Za-z0-9 .'\-]*?):\s?(.*)$")
VTT_TAG_SPEAKER = re.compile(r"^<v\s+([^>]+)>(.*?)(</v>)?$")
VTT_TIME_LINE = re.compile(
    r"(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})"
)


@dataclass
class RawUtterance:
    speaker: str
    start: Optional[float]  # None means "not given, synthesize"
    text: str


def _ts_to_seconds(ts: str) -> float:
    parts = [int(p) for p in ts.split(":")]
    if len(parts) == 2:
        minutes, seconds = parts
        return float(minutes * 60 + seconds)
    hours, minutes, seconds = parts
    return float(hours * 3600 + minutes * 60 + seconds)


def _estimate_duration(text: str) -> float:
    words = len(text.split())
    return max(words / WORDS_PER_MINUTE * 60.0, 1.0)


def _fill_start_end(raw: List[RawUtterance]) -> List[Dict[str, Any]]:
    """Assign start/end seconds: explicit starts are kept, missing ones are
    synthesized back-to-back at WORDS_PER_MINUTE. end_sec of a segment is the
    next segment's start_sec; the last segment's end is start + estimated duration.
    """
    starts: List[float] = []
    durations: List[float] = []
    running_time = 0.0
    for u in raw:
        start_sec = u.start if u.start is not None else running_time
        duration = _estimate_duration(u.text)
        running_time = start_sec + duration
        starts.append(start_sec)
        durations.append(duration)

    segments = []
    for i, u in enumerate(raw):
        end_sec = starts[i + 1] if i + 1 < len(raw) else starts[i] + durations[i]
        segments.append({"speaker": u.speaker, "start": starts[i], "end": end_sec, "text": u.text})
    return segments


def parse_txt(content: str) -> List[Dict[str, Any]]:
    raw: List[RawUtterance] = []
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue

        rest = line
        timestamp: Optional[float] = None
        m = TS_BRACKET.match(rest)
        if m:
            timestamp = _ts_to_seconds(m.group(1))
            rest = m.group(2)
        else:
            m = TS_PLAIN.match(rest)
            if m:
                timestamp = _ts_to_seconds(m.group(1))
                rest = m.group(2)

        speaker_match = SPEAKER_RE.match(rest)
        if speaker_match:
            speaker = speaker_match.group(1).strip()
            text = speaker_match.group(2).strip()
            raw.append(RawUtterance(speaker=speaker, start=timestamp, text=text))
        elif raw:
            # continuation line: append to the previous speaker's utterance
            raw[-1].text = (raw[-1].text + " " + rest).strip()
        # a line with no speaker prefix and no prior utterance is dropped

    return _fill_start_end(raw)


def parse_vtt(content: str) -> List[Dict[str, Any]]:
    lines = content.splitlines()
    segments = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line == "WEBVTT" or line.upper().startswith("NOTE"):
            i += 1
            continue
        time_match = VTT_TIME_LINE.search(line)
        if not time_match:
            i += 1
            continue  # skip cue identifier lines

        start_sec = _vtt_timestamp_to_seconds(time_match, 1)
        end_sec = _vtt_timestamp_to_seconds(time_match, 5)

        i += 1
        text_lines = []
        while i < len(lines) and lines[i].strip():
            text_lines.append(lines[i].strip())
            i += 1
        cue_text = " ".join(text_lines)

        speaker, text = _split_vtt_speaker(cue_text)
        segments.append({"speaker": speaker, "start": start_sec, "end": end_sec, "text": text})
        i += 1

    return segments


def _vtt_timestamp_to_seconds(match: re.Match, group_offset: int) -> float:
    hours = match.group(group_offset) or "0:"
    hours = int(hours.rstrip(":"))
    minutes = int(match.group(group_offset + 1))
    seconds = int(match.group(group_offset + 2))
    millis = int(match.group(group_offset + 3))
    return hours * 3600 + minutes * 60 + seconds + millis / 1000.0


def _split_vtt_speaker(cue_text: str) -> Tuple[str, str]:
    tag_match = VTT_TAG_SPEAKER.match(cue_text)
    if tag_match:
        return tag_match.group(1).strip(), tag_match.group(2).strip()
    speaker_match = SPEAKER_RE.match(cue_text)
    if speaker_match:
        return speaker_match.group(1).strip(), speaker_match.group(2).strip()
    return "Speaker 1", cue_text


def parse_json_transcript(content: str) -> List[Dict[str, Any]]:
    data = json.loads(content)
    items = data["segments"] if isinstance(data, dict) else data

    raw_items = []
    for item in items:
        raw_items.append(
            {
                "speaker": item.get("speaker") or "Speaker 1",
                "start": item.get("start"),
                "end": item.get("end"),
                "text": item.get("text", ""),
            }
        )

    # If every item already has an explicit end, use them as-is.
    if all(item["end"] is not None for item in raw_items):
        return [
            {"speaker": it["speaker"], "start": float(it["start"]), "end": float(it["end"]), "text": it["text"]}
            for it in raw_items
        ]

    # Otherwise fall back to the same start/end synthesis as plain text.
    raw = [RawUtterance(speaker=it["speaker"], start=it["start"], text=it["text"]) for it in raw_items]
    return _fill_start_end(raw)


def parse_transcript(filename: str, content: str) -> List[Dict[str, Any]]:
    """Dispatch by extension. Raises ValueError for unsupported extensions."""
    lower = filename.lower()
    if lower.endswith(".txt"):
        return parse_txt(content)
    if lower.endswith(".vtt"):
        return parse_vtt(content)
    if lower.endswith(".json"):
        return parse_json_transcript(content)
    raise ValueError(f"Unsupported file extension for: {filename}")
