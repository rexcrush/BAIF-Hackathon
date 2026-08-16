"""
Phase 6 (Part B continued): Build a full dubbed audio track from
translated, timestamped segments.

Approach (deliberately simple for a hackathon, not perfect lip-sync):
  1. Synthesize each segment's translated text to speech (TTS)
  2. If the synthesized clip is LONGER than its (start,end) window,
     speed it up (ffmpeg atempo) so it fits without overlapping the
     next segment.
  3. If it's SHORTER, leave it as-is — it'll just end a bit early
     within its window, followed by natural silence. This sounds
     far better than artificially stretching/slowing speech, which
     tends to sound unnatural.
  4. Overlay every processed segment onto a silent base track at
     its correct start time, producing one continuous audio file
     the same total length as the original video's speech portion.
"""

import subprocess
import tempfile
import os
from pathlib import Path

from pydub import AudioSegment

from core.tts import synthesize


def _speed_up_audio(input_path: str, output_path: str, factor: float) -> str:
    """
    Speeds up an audio file by `factor` using ffmpeg's atempo filter.
    atempo only supports 0.5–2.0 per filter instance, so for larger
    factors we chain multiple atempo filters together.
    """
    factor = max(factor, 1.01)  # only ever speeding up here, never slowing down
    filters = []
    remaining = factor
    while remaining > 2.0:
        filters.append("atempo=2.0")
        remaining /= 2.0
    filters.append(f"atempo={remaining:.3f}")
    filter_str = ",".join(filters)

    command = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter:a", filter_str,
        output_path,
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg atempo failed:\n{result.stderr}")
    return output_path


def build_dubbed_track(
    segments: list[dict],
    language: str,
    output_path: str,
    max_speed_factor: float = 1.3,
) -> str:
    """
    segments: [{"start": float, "end": float, "translated_text": str}, ...]
    language: "english" | "hindi" | "marathi" — determines which TTS voice
    max_speed_factor: hard cap on how much we'll speed up a clip. Beyond
        this, speech becomes hard to understand, so we accept a small
        overlap into the next segment instead of over-compressing audio.

    Returns path to the final stitched .wav audio track.
    """
    if not segments:
        raise ValueError("No segments provided")

    total_duration_ms = int(max(seg["end"] for seg in segments) * 1000) + 500
    timeline = AudioSegment.silent(duration=total_duration_ms)

    with tempfile.TemporaryDirectory() as tmp_dir:
        for i, seg in enumerate(segments):
            text = seg["translated_text"].strip()
            if not text:
                continue

            raw_tts_path = os.path.join(tmp_dir, f"seg_{i}_raw.wav")
            synthesize(text, language, raw_tts_path)

            clip = AudioSegment.from_wav(raw_tts_path)

            # Real available time is until the NEXT segment starts, not just
            # this segment's own (often tight) end timestamp — there's
            # usually natural slack there we should use before speeding up.
            if i + 1 < len(segments):
                available_ms = (segments[i + 1]["start"] - seg["start"]) * 1000
            else:
                available_ms = total_duration_ms - (seg["start"] * 1000)

            # Small buffer so consecutive clips don't butt up with zero gap
            available_ms = max(available_ms - 80, 200)

            if available_ms > 0 and len(clip) > available_ms:
                factor = min(len(clip) / available_ms, max_speed_factor)
                if factor > 1.03:  # skip trivial speed-ups, not worth the quality hit
                    sped_path = os.path.join(tmp_dir, f"seg_{i}_sped.wav")
                    _speed_up_audio(raw_tts_path, sped_path, factor)
                    clip = AudioSegment.from_wav(sped_path)

            start_ms = int(seg["start"] * 1000)
            timeline = timeline.overlay(clip, position=start_ms)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    timeline.export(output_path, format="wav")
    return output_path