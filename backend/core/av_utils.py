"""
Phase 3: ffmpeg wrapper utilities.

Handles pulling audio out of an uploaded video/audio file and
normalizing it to a consistent format (16kHz mono WAV) that
Whisper expects for best results.
"""

import subprocess
import shutil
from pathlib import Path


def check_ffmpeg_installed() -> bool:
    return shutil.which("ffmpeg") is not None


def extract_audio(input_path: str, output_path: str) -> str:
    """
    Extracts (or converts) audio from a video/audio file into a
    16kHz mono WAV file — the format Whisper works best with.

    Works whether input is a video (mp4, mov, mkv...) or already
    an audio file (mp3, wav, m4a...) — ffmpeg handles both the same way.
    """
    if not check_ffmpeg_installed():
        raise RuntimeError(
            "ffmpeg not found on PATH. Install it and restart your terminal."
        )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    command = [
        "ffmpeg",
        "-y",                  # overwrite output if it exists
        "-i", input_path,      # input file
        "-vn",                 # drop video stream (audio only)
        "-acodec", "pcm_s16le",# standard uncompressed WAV codec
        "-ar", "16000",        # 16kHz sample rate (what Whisper expects)
        "-ac", "1",            # mono
        output_path,
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{result.stderr}")

    return output_path


def mux_audio_into_video(video_path: str, audio_path: str, output_path: str) -> str:
    """
    Replaces the audio track of a video with a new audio file.
    Used later in Phase 5 (dubbing) — included now so av_utils.py
    is the single place for all ffmpeg logic.
    """
    if not check_ffmpeg_installed():
        raise RuntimeError(
            "ffmpeg not found on PATH. Install it and restart your terminal."
        )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    command = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",        # don't re-encode video (fast, lossless)
        "-map", "0:v:0",       # take video from first input
        "-map", "1:a:0",       # take audio from second input
        "-shortest",           # match length to shorter stream
        output_path,
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{result.stderr}")

    return output_path



def burn_subtitles_into_video(video_path: str, srt_path: str, output_path: str) -> str:
    """
    Hard-burns subtitles from an .srt file directly into the video frames.
    Unlike soft subtitles (separate track), this is guaranteed to display
    on any player/device, which matters for NGO field use where the
    playback device/app is unpredictable.
    """
    if not check_ffmpeg_installed():
        raise RuntimeError(
            "ffmpeg not found on PATH. Install it and restart your terminal."
        )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # ffmpeg's subtitles filter needs the srt path passed inside its
    # filter-graph string. On Windows, backslashes and the drive-letter
    # colon (C:) both need escaping, or ffmpeg misparses the path.
    srt_path_escaped = (
        str(Path(srt_path).resolve())
        .replace("\\", "/")
        .replace(":", "\\:")
    )

    command = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vf", f"subtitles='{srt_path_escaped}'",
        "-map", "0:v:0",
        "-map", "0:a:0",
        "-c:a", "aac",   # keep original audio untouched
        output_path,
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{result.stderr}")

    return output_path


if __name__ == "__main__":
    print("ffmpeg installed:", check_ffmpeg_installed())