"""
Phase 5: Generate .srt subtitle files from timestamped segments.

SRT format looks like:

1
00:00:00,000 --> 00:00:02,580
This is the first subtitle line.

2
00:00:02,580 --> 00:00:08,020
This is the second subtitle line.
"""

from pathlib import Path


def _format_timestamp(seconds: float) -> str:
    """Converts seconds (float) into SRT timestamp format: HH:MM:SS,mmm"""
    total_ms = int(round(seconds * 1000))
    hours = total_ms // 3_600_000
    minutes = (total_ms % 3_600_000) // 60_000
    secs = (total_ms % 60_000) // 1000
    ms = total_ms % 1000
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def generate_srt(segments: list[dict]) -> str:
    """
    segments: [{"start": float, "end": float, "text": str}, ...]
    Returns the full .srt file content as a string.
    """
    lines = []
    for idx, seg in enumerate(segments, start=1):
        start_ts = _format_timestamp(seg["start"])
        end_ts = _format_timestamp(seg["end"])
        text = seg["text"].strip()

        lines.append(str(idx))
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(text)
        lines.append("")  # blank line between entries

    return "\n".join(lines)


def save_srt(segments: list[dict], output_path: str) -> str:
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    content = generate_srt(segments)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    return output_path