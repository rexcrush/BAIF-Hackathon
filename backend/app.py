"""
Run with:  uvicorn app:app --reload
Then open: http://127.0.0.1:8000/docs
"""

import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List

from core.translate import translate, LANG_CODES
from core.av_utils import extract_audio, burn_subtitles_into_video, mux_audio_into_video
from core.dubbing import build_dubbed_track
from core.asr import transcribe
from core.subtitles import save_srt
from core.tts import synthesize

# Map our app's language names to Whisper's ISO codes, so the user's
# selected source language can be passed as a hint instead of relying
# purely on auto-detection.
WHISPER_LANG_HINTS = {
    "english": "en",
    "hindi": "hi",
    "marathi": "mr",
}

CODE_TO_LANG = {
    "en": "english",
    "hi": "hindi",
    "mr": "marathi",
}

app = FastAPI(title="Sanskriti Sync - Backend")

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Mount outputs directory so browser audio/video players can stream files directly
app.mount("/media", StaticFiles(directory="outputs"), name="media")


class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class TranslateResponse(BaseModel):
    translated_text: str


class SegmentIn(BaseModel):
    start: float
    end: float
    text: str


class TranslateSegmentsRequest(BaseModel):
    job_id: str
    segments: List[SegmentIn]
    source_lang: str   # "english" | "hindi" | "marathi"
    target_lang: str   # "english" | "hindi" | "marathi"

class BurnSubtitlesRequest(BaseModel):
    job_id: str
    srt_filename: str


class DubVideoRequest(BaseModel):
    job_id: str
    segments: List[SegmentIn]          # original timestamps
    translated_texts: List[str]        # translated text, same order as segments
    target_lang: str



@app.get("/")
def health_check():
    return {"status": "ok", "supported_languages": list(LANG_CODES.keys())}


@app.post("/translate", response_model=TranslateResponse)
def translate_text(req: TranslateRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        result = translate(req.text, req.source_lang, req.target_lang)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return TranslateResponse(translated_text=result)


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), source_language: str = Form(None)):
    """
    Accepts a video or audio file, saves it, extracts audio, and
    transcribes it into timestamped segments.

    source_language: optional hint ("english" | "hindi" | "marathi").
                      If omitted, Whisper auto-detects.

    Returns a job_id plus the full transcript — this is what the
    frontend will display to the user for review/editing before
    translation happens.
    """
    job_id = str(uuid.uuid4())

    original_suffix = Path(file.filename).suffix
    saved_input_path = UPLOAD_DIR / f"{job_id}{original_suffix}"

    with open(saved_input_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    extracted_audio_path = OUTPUT_DIR / f"{job_id}_audio.wav"

    try:
        extract_audio(str(saved_input_path), str(extracted_audio_path))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    lang_hint = None
    if source_language:
        lang_hint = WHISPER_LANG_HINTS.get(source_language.lower())
        if lang_hint is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported source_language: {source_language}",
            )

    try:
        transcript = transcribe(str(extracted_audio_path), language=lang_hint)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    detected_code = transcript.get("language", "hi")
    detected_full_name = CODE_TO_LANG.get(detected_code, detected_code)

    return {
        "job_id": job_id,
        "original_filename": file.filename,
        "extracted_audio_path": str(extracted_audio_path),
        "detected_language": detected_full_name,
        "language_confidence": transcript.get("language_probability", 1.0),
        "segments": transcript["segments"],
    }



@app.post("/translate-segments")
def translate_segments(req: TranslateSegmentsRequest):
    """
    Translates each transcript segment individually (preserving
    timestamps), then saves the translated segments as a downloadable
    .srt subtitle file.
    """
    if req.source_lang.lower() not in LANG_CODES or req.target_lang.lower() not in LANG_CODES:
        raise HTTPException(status_code=400, detail="Unsupported language in request")

    translated_segments = []
    for seg in req.segments:
        try:
            translated_text = translate(seg.text, req.source_lang, req.target_lang)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        translated_segments.append({
            "start": seg.start,
            "end": seg.end,
            "original_text": seg.text,
            "translated_text": translated_text,
        })

    # Build SRT using translated text
    srt_ready_segments = [
        {"start": s["start"], "end": s["end"], "text": s["translated_text"]}
        for s in translated_segments
    ]
    srt_filename = f"{req.job_id}_{req.target_lang.lower()}.srt"
    srt_path = OUTPUT_DIR / srt_filename
    save_srt(srt_ready_segments, str(srt_path))

    return {
        "job_id": req.job_id,
        "target_lang": req.target_lang,
        "segments": translated_segments,
        "srt_filename": srt_filename,
    }


class SaveSrtRequest(BaseModel):
    job_id: str
    target_lang: str
    segments: List[SegmentIn]


@app.post("/save-srt")
def save_custom_srt(req: SaveSrtRequest):
    """
    Saves an updated/edited SRT file from user-reviewed translated segments.
    """
    srt_ready_segments = [
        {"start": s.start, "end": s.end, "text": s.text}
        for s in req.segments
    ]
    srt_filename = f"{req.job_id}_{req.target_lang.lower()}.srt"
    srt_path = OUTPUT_DIR / srt_filename
    save_srt(srt_ready_segments, str(srt_path))
    return {
        "job_id": req.job_id,
        "srt_filename": srt_filename,
        "message": "SRT updated successfully"
    }


@app.get("/download/{filename}")
def download_file(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path), filename=filename)


def _find_uploaded_file(job_id: str) -> Path:
    """Finds the originally uploaded file for a job_id (extension unknown)."""
    matches = list(UPLOAD_DIR.glob(f"{job_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"No uploaded file found for job_id={job_id}")
    return matches[0]


@app.post("/burn-subtitles")
def burn_subtitles(req: BurnSubtitlesRequest):
    """
    Hard-burns the translated .srt onto the original uploaded video.
    Returns a downloadable filename for the subtitled video.
    """
    video_path = _find_uploaded_file(req.job_id)
    srt_path = OUTPUT_DIR / req.srt_filename

    if not srt_path.exists():
        raise HTTPException(status_code=404, detail=f"SRT file not found: {req.srt_filename}")

    output_filename = f"{req.job_id}_subtitled{video_path.suffix}"
    output_path = OUTPUT_DIR / output_filename

    try:
        burn_subtitles_into_video(str(video_path), str(srt_path), str(output_path))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "job_id": req.job_id,
        "subtitled_video_filename": output_filename,
    }

class DubVideoRequest(BaseModel):
    job_id: str
    segments: List[SegmentIn]          # original timestamps
    translated_texts: List[str]        # translated text, same order as segments
    target_lang: str


@app.post("/dub-video")
def dub_video(req: DubVideoRequest):
    """
    Generates a full dubbed audio track from translated segments,
    then replaces the original video's audio with it.
    """
    if len(req.segments) != len(req.translated_texts):
        raise HTTPException(
            status_code=400,
            detail="segments and translated_texts must be the same length",
        )

    if req.target_lang.lower() not in LANG_CODES:
        raise HTTPException(status_code=400, detail="Unsupported target_lang")

    dub_segments = [
        {
            "start": seg.start,
            "end": seg.end,
            "translated_text": text,
        }
        for seg, text in zip(req.segments, req.translated_texts)
    ]

    dubbed_audio_path = OUTPUT_DIR / f"{req.job_id}_dubbed_audio.wav"
    try:
        build_dubbed_track(dub_segments, req.target_lang, str(dubbed_audio_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dubbing failed: {e}")

    video_path = _find_uploaded_file(req.job_id)
    output_filename = f"{req.job_id}_dubbed{video_path.suffix}"
    output_path = OUTPUT_DIR / output_filename

    try:
        mux_audio_into_video(str(video_path), str(dubbed_audio_path), str(output_path))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "job_id": req.job_id,
        "dubbed_video_filename": output_filename,
    }


class TTSPreviewRequest(BaseModel):
    text: str
    language: str


@app.post("/tts-preview")
def tts_preview(req: TTSPreviewRequest):
    """
    Synthesizes short text preview using MMS-TTS and returns the audio URL.
    """
    clean_text = req.text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Cannot synthesize empty text")

    lang = req.language.lower()
    if lang not in LANG_CODES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {req.language}")

    import hashlib
    text_hash = hashlib.md5(f"{lang}_{clean_text}".encode("utf-8")).hexdigest()[:12]
    preview_filename = f"preview_{text_hash}.wav"
    preview_path = OUTPUT_DIR / preview_filename

    if not preview_path.exists():
        try:
            synthesize(clean_text, lang, str(preview_path))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {e}")

    return {
        "audio_filename": preview_filename,
        "audio_url": f"/media/{preview_filename}",
    }