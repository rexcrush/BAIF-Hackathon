"""
Phase 4: Speech-to-text using faster-whisper (CPU, int8 quantized).

Run standalone to test:  python core/asr.py <path_to_audio.wav>
"""

import sys
from faster_whisper import WhisperModel

# Model size options (CPU-friendly, smallest to largest):
#   "tiny"   - fastest, lowest accuracy
#   "base"   - good speed/accuracy balance for a hackathon demo
#   "small"  - better accuracy, noticeably slower on CPU
# Start with "base"; bump to "small" later if accuracy isn't good enough
# and you can tolerate the slower run time.
MODEL_SIZE = "small"

_model = None


def _get_model():
    global _model
    if _model is None:
        print(f"Loading faster-whisper model ({MODEL_SIZE}, int8, CPU)...")
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    return _model


def transcribe(audio_path: str, language: str = None, vad_filter: bool = False):
    """
    Transcribes audio into timestamped segments.

    language: ISO code hint like "en", "hi", "mr" — optional.
              If None, Whisper auto-detects the spoken language.

    Returns: {
        "language": detected/used language code,
        "segments": [
            {"start": float, "end": float, "text": str},
            ...
        ]
    }
    """
    model = _get_model()

    segments_iter, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        vad_filter=vad_filter   # skips silent gaps, improves segment quality
    )

    segments = []
    for seg in segments_iter:
        segments.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        })

    return {
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "segments": segments,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python core/asr.py <path_to_audio.wav>")
        sys.exit(1)

    audio_path = sys.argv[1]
    result = transcribe(audio_path, language="hi", vad_filter=False)

    print(f"\nDetected language: {result['language']} "
          f"(confidence: {result['language_probability']})\n")

    for seg in result["segments"]:
        print(f"[{seg['start']:>6.2f}s -> {seg['end']:>6.2f}s]  {seg['text']}")