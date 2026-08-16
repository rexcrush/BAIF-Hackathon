# NGO Translator - AI-Powered Video & Audio Translation Platform

## Project Overview

**NGO Translator** is an intelligent video and audio translation platform designed to democratize content accessibility. It enables organizations to automatically translate, transcribe, and dub multimedia content across English, Hindi, and Marathi languages while preserving original audio quality and timing.

### Use Cases

- **NGO Content Localization**: Translate educational and awareness videos into regional languages
- **Accessibility**: Create subtitle versions in multiple languages
- **Multilingual Dubbing**: Produce fully dubbed versions for broader audience reach
- **Content Repurposing**: One source video, multiple language outputs

---

## Architecture Overview

### System Design Philosophy

The system follows a **modular, phase-based architecture** where each linguistic/media processing task is isolated into independent components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NGO TRANSLATOR                               │
│                       (FastAPI Backend)                             │
└─────────────────────────────────────────────────────────────────────┘

                              │
                 ┌────────────┴────────────┐
                 │                         │
         ┌───────▼──────────┐      ┌──────▼────────────┐
         │  Video Upload    │      │  Audio Extraction │
         │  Management      │      │  (Phase 3)        │
         └──────────────────┘      └──────┬───────────┘
                                          │
                                   ┌──────▼──────────┐
                                   │  Transcription  │
                                   │  (Phase 4)      │
                                   │  Faster-Whisper │
                                   └──────┬──────────┘
                                          │
                            ┌─────────────┴─────────────┐
                            │                           │
                    ┌───────▼─────────┐        ┌────────▼────────┐
                    │   Translation   │        │  Translation    │
                    │   (Phase 1)     │        │  per-Segment    │
                    │  IndicTrans2    │        │  (API)          │
                    └─────────────────┘        └─────┬───────────┘
                                                     │
                            ┌────────────────────────┴────────────────┐
                            │                                         │
                  ┌─────────▼──────────┐                  ┌──────────▼─────┐
                  │  Subtitles Path    │                  │   Dubbing Path  │
                  │  (Phase 5)         │                  │   (Phase 6)     │
                  └─────────┬──────────┘                  └────────┬────────┘
                            │                                     │
                 ┌──────────▼──────────┐         ┌───────────────▼────────┐
                 │  SRT Generation    │         │ Text-to-Speech (TTS)   │
                 │  (Format Segments) │         │ Facebook MMS-TTS       │
                 └──────────┬──────────┘         └───────────┬───────────┘
                            │                               │
                 ┌──────────▼──────────┐         ┌──────────▼──────────┐
                 │ Burn Subtitles     │         │ Speed Adjustment    │
                 │ (FFmpeg)           │         │ (Smart Timing)      │
                 └──────────┬──────────┘         └──────────┬──────────┘
                            │                               │
                 ┌──────────▼──────────┐         ┌──────────▼──────────┐
                 │ Final Video with    │         │ Mux Dubbed Audio    │
                 │ Embedded Subtitles  │         │ into Video (FFmpeg) │
                 └─────────────────────┘         └──────────┬──────────┘
                                                           │
                                                 ┌─────────▼──────────┐
                                                 │ Final Dubbed Video │
                                                 └────────────────────┘
```

---

## Complete Data Flow

### Step-by-Step Process

#### **1. Upload Phase**

```
User uploads video/audio file
         │
         ▼
    /upload endpoint
         │
         ├─ Save original file to uploads/ with UUID job_id
         ├─ Extract audio to 16kHz mono WAV (FFmpeg)
         └─ Transcribe with language hint (Faster-Whisper)
              │
              └─ Return: job_id, transcript with segments & timestamps
```

#### **2. Translation Phase**

```
Frontend receives segments with timestamps
         │
         ▼
User selects source & target language
         │
         ▼
/translate-segments endpoint
         │
         ├─ For each segment:
         │   ├─ Extract text
         │   ├─ Clean corrupted characters
         │   └─ Translate using IndicTrans2 models
         │
         ├─ Generate SRT file with translated text
         └─ Return: translated segments + SRT filename
```

#### **3A. Subtitling Path (Lightweight)**

```
User downloads SRT file
         │
         ▼
/burn-subtitles endpoint
         │
         ├─ Load original video
         ├─ Load translated SRT
         └─ Hard-burn subtitles using FFmpeg (libass)
              │
              └─ Output: Video with burnt-in subtitles
```

#### **3B. Dubbing Path (Intensive)**

```
User provides segments + translated_texts + target_lang
         │
         ▼
/dub-video endpoint
         │
         ├─ For each translated segment:
         │   ├─ Synthesize text→speech (Facebook MMS-TTS)
         │   ├─ Calculate available time until next segment
         │   └─ IF clip too long: Speed up using FFmpeg atempo filter
         │       (max 1.3x to avoid quality degradation)
         │
         ├─ Overlay all clips onto silent audio track at correct timing
         ├─ Mux dubbed audio back into original video
         └─ Output: Full dubbed video
```

---

## Technology Stack

### Core Dependencies

| Component              | Technology       | Purpose                             | Model Size               |
| ---------------------- | ---------------- | ----------------------------------- | ------------------------ |
| **Web Framework**      | FastAPI          | HTTP API, async handling            | —                        |
| **Audio Extraction**   | FFmpeg           | Video→Audio conversion (16kHz mono) | System binary            |
| **Speech-to-Text**     | Faster-Whisper   | Audio→Timestamped transcript        | "small" (CPU int8)       |
| **Translation**        | IndicTrans2      | Multilingual translation (En↔Hi↔Mr) | 200M/320M params         |
| **Text-to-Speech**     | Facebook MMS-TTS | Translated text→Audio               | 1-2M params per language |
| **Audio Mux**          | FFmpeg           | Audio+Video merging                 | System binary            |
| **Audio Manipulation** | PyDub + FFmpeg   | Speed adjustment, overlaying        | —                        |

### Model Details

**IndicTrans2** (Translation):

- `ai4bharat/indictrans2-en-indic-dist-200M`: English ↔ Indian languages
- `ai4bharat/indictrans2-indic-en-dist-200M`: Indian languages → English
- `ai4bharat/indictrans2-indic-indic-dist-320M`: Hindi ↔ Marathi (direct)
- Quantized for CPU inference

**Facebook MMS-TTS** (Text-to-Speech):

- One checkpoint per language (English, Hindi, Marathi)
- VITS architecture, ~1-2M parameters per model
- CPU-friendly single-speaker synthesis

**Faster-Whisper** (ASR):

- Model size: "small" (774M parameters)
- INT8 quantized on CPU
- Can upgrade to "base" for speed or "small" for better accuracy

### Environment Requirements

- **Python**: 3.9+
- **FFmpeg**: System binary (brew/apt install)
- **RAM**: 8GB+ (models + concurrent processing)
- **Disk**: 5GB+ (model caches + temp files)

---

## Supported Languages

| Language    | ISO Code | IndicTrans Code | MMS-TTS                | Whisper |
| ----------- | -------- | --------------- | ---------------------- | ------- |
| **English** | en       | eng_Latn        | ✓ facebook/mms-tts-eng | ✓       |
| **Hindi**   | hi       | hin_Deva        | ✓ facebook/mms-tts-hin | ✓       |
| **Marathi** | mr       | mar_Deva        | ✓ facebook/mms-tts-mar | ✓       |

**Note**: Translation works in all directions (En↔Hi↔Mr). ASR auto-detects language but performs better with hints.

---

## Setup & Installation

### Prerequisites

```bash
# Check Python version
python --version  # Must be 3.9+

# Install FFmpeg
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: sudo apt install ffmpeg

# Verify installation
ffmpeg -version
```

### Step 1: Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: First torch installation may take 1-2 minutes due to CPU wheels.

### Step 3: Verify Model Downloads (First Run)

```bash
# Test each component independently
python core/translate.py       # IndicTrans2 downloads (~500MB)
python core/tts.py            # MMS-TTS models download (~100MB each)
python core/asr.py test.wav   # Whisper downloads (~774MB)
```

### Step 4: Start Server

```bash
# From backend/ directory
uvicorn app:app --reload

# Server available at:
# - API: http://127.0.0.1:8000
# - Docs: http://127.0.0.1:8000/docs
# - ReDoc: http://127.0.0.1:8000/redoc
```

---

## API Reference

### Health Check

```http
GET /
```

**Response**:

```json
{
  "status": "ok",
  "supported_languages": ["english", "hindi", "marathi"]
}
```

---

### 1. Upload & Transcribe

```http
POST /upload
Content-Type: multipart/form-data

file: <video or audio file>
source_language: [optional] "english" | "hindi" | "marathi"
```

**Response**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "original_filename": "video.mp4",
  "extracted_audio_path": "outputs/550e8400_audio.wav",
  "detected_language": "en",
  "language_confidence": 0.98,
  "segments": [
    {
      "start": 0.5,
      "end": 3.2,
      "text": "Hello, how are you today?"
    },
    {
      "start": 3.5,
      "end": 6.8,
      "text": "I'm doing great, thanks for asking."
    }
  ]
}
```

**Notes**:

- `job_id`: Unique identifier for this upload session; use in all subsequent requests
- `segments`: Array of timestamped transcript chunks (avg 5-10 seconds each)
- Language hints improve Whisper accuracy; omit for auto-detection

---

### 2. Translate Segments (Standalone Text Translation)

```http
POST /translate
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "source_lang": "english",
  "target_lang": "hindi"
}
```

**Response**:

```json
{
  "translated_text": "नमस्ते, आप कैसे हैं?"
}
```

---

### 3. Translate All Segments & Generate SRT

```http
POST /translate-segments
Content-Type: application/json

{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "segments": [
    {"start": 0.5, "end": 3.2, "text": "Hello, how are you today?"},
    {"start": 3.5, "end": 6.8, "text": "I'm doing great, thanks for asking."}
  ],
  "source_lang": "english",
  "target_lang": "hindi"
}
```

**Response**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_lang": "hindi",
  "srt_filename": "550e8400_hindi.srt",
  "segments": [
    {
      "start": 0.5,
      "end": 3.2,
      "original_text": "Hello, how are you today?",
      "translated_text": "नमस्ते, आप आज कैसे हैं?"
    }
  ]
}
```

**Output file format** (SRT):

```
1
00:00:00,500 --> 00:00:03,200
नमस्ते, आप आज कैसे हैं?

2
00:00:03,500 --> 00:00:06,800
मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद।
```

---

### 4. Burn Subtitles onto Video

```http
POST /burn-subtitles
Content-Type: application/json

{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "srt_filename": "550e8400_hindi.srt"
}
```

**Response**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "subtitled_video_filename": "550e8400_subtitled.mp4"
}
```

**Note**: Subtitles are hard-burned (embedded) into the video and cannot be removed.

---

### 5. Create Dubbed Video

```http
POST /dub-video
Content-Type: application/json

{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "segments": [
    {"start": 0.5, "end": 3.2, "text": ""},  // ignored
    {"start": 3.5, "end": 6.8, "text": ""}   // ignored
  ],
  "translated_texts": [
    "नमस्ते, आप आज कैसे हैं?",
    "मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद।"
  ],
  "target_lang": "hindi"
}
```

**Response**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "dubbed_video_filename": "550e8400_dubbed.mp4"
}
```

**Processing Details**:

- TTS generates speech for each segment (usually slower than segment duration)
- Smart speed adjustment: If clip exceeds available time, speeds up by factor ≤ 1.3x
- Natural gaps preserved: Shorter clips leave silence, avoiding artificial stretching
- Final audio overlayed perfectly onto original video timeline

---

### 6. Download Output Files

```http
GET /download/{filename}

# Examples:
# GET /download/550e8400_hindi.srt
# GET /download/550e8400_subtitled.mp4
# GET /download/550e8400_dubbed.mp4
```

---

## Project File Structure

```
translator-app/
│
├── backend/
│   │
│   ├── app.py                    # Main FastAPI application & endpoints
│   ├── requirements.txt           # Python dependencies
│   │
│   ├── core/                      # Modular processing pipeline
│   │   ├── asr.py                # Phase 4: Speech-to-text (Faster-Whisper)
│   │   ├── translate.py          # Phase 1: Translation (IndicTrans2)
│   │   ├── tts.py                # Phase 6B: Text-to-speech (MMS-TTS)
│   │   ├── dubbing.py            # Phase 6B+: Dubbing pipeline
│   │   ├── subtitles.py          # Phase 5: SRT generation
│   │   └── av_utils.py           # Phase 3: Audio/Video utilities (FFmpeg)
│   │
│   ├── uploads/                  # Temporary storage for uploaded files
│   │   └── {job_id}.*            # Original files (mp4, mov, mp3, etc.)
│   │
│   ├── outputs/                  # Final output files
│   │   ├── {job_id}_audio.wav    # Extracted audio
│   │   ├── {job_id}_hindi.srt    # Generated subtitles
│   │   ├── {job_id}_subtitled.*  # Video with burnt subtitles
│   │   ├── {job_id}_dubbed_audio.wav  # Synthesized dubbed track
│   │   └── {job_id}_dubbed.*     # Final dubbed video
│   │
│   ├── models/                   # (Future) Pre-downloaded model cache
│   └── venv/                     # Python virtual environment
│
├── README.md                      # This file
└── test.txt                       # Quick reference commands
```

---

## Key Design Decisions

### 1. **Modular Phase-Based Architecture**

Each processing step is independent, allowing:

- Easy testing of individual components
- Swapping implementations (e.g., different ASR/TTS models)
- Parallel development of front-end while back-end is being refined
- Clear separation of concerns

### 2. **Smart Dubbing Speed Adjustment**

Rather than padding/stretching audio (sounds unnatural), we:

- Synthesize text to speech for each segment
- Compare duration to available time slot
- Only speed up if necessary (max 1.3x to preserve quality)
- Accept silence gaps if TTS is shorter (natural-sounding)

### 3. **Model Caching**

- Models loaded on first use, cached in-memory for subsequent calls
- Reduces latency for repeated operations
- Trades startup time for throughput

### 4. **CPU-Optimized Inference**

- All models run on CPU (no GPU required)
- INT8 quantization for Whisper and IndicTrans2
- Float32 for TTS (quality priority, single-run operation)
- Suitable for hackathon/NGO deployment constraints

### 5. **Job-Based Architecture**

- Each upload gets unique `job_id` (UUID)
- All outputs tied to job_id for tracking
- Enables multi-user concurrent usage
- Allows partial job completion (e.g., subtitle-only vs. full dub)

---

## Performance Characteristics

### Typical Processing Time (1min 30sec video, single-threaded CPU)

| Component                      | Time        | Model                  | Notes                       |
| ------------------------------ | ----------- | ---------------------- | --------------------------- |
| Upload + Extract Audio         | 5-10s       | FFmpeg                 | Depends on file size/format |
| Transcription (ASR)            | 15-30s      | Faster-Whisper "small" | 1min audio ≈ 20-30s         |
| Translation (50 segments)      | 10-20s      | IndicTrans2-200M       | ≈ 200-400ms per segment     |
| TTS Synthesis (50 segments)    | 30-60s      | MMS-TTS                | ≈ 600-1200ms per segment    |
| Speed Adjustment + Muxing      | 10-20s      | FFmpeg                 | Depends on format           |
| **Total (End-to-End Dubbing)** | **90-180s** | All                    | ~2-3min for 1.5min video    |
| Subtitling Only                | 25-40s      | ASR+Translate          | Skip TTS/Speed steps        |

### Resource Usage

- **RAM**: 2-3GB (models loaded)
- **CPU**: 1 core max (single-threaded models)
- **Disk**: ~5GB (model caches) + temp files during processing
- **Temp Disk During Job**: 100-500MB (depends on video size)

---

## Common Issues & Troubleshooting

### Issue: "ffmpeg not found"

```bash
# Install FFmpeg:
# macOS: brew install ffmpeg
# Windows: choco install ffmpeg  OR  download from ffmpeg.org
# Linux: sudo apt install ffmpeg

# Restart terminal and verify:
ffmpeg -version
```

### Issue: Model Download on First Run

- Expected behavior; models (~500MB each) download automatically
- First run of `translate.py` may take 2-5 minutes
- Cached afterward

### Issue: Out of Memory

- Reduce model size: Change `MODEL_SIZE = "base"` in `core/asr.py`
- Process shorter videos
- Close other applications

### Issue: Poor Translation Quality

- Verify source_language hint during upload (improves ASR accuracy)
- Check original transcript quality (ASR errors propagate to translation)
- Complex sentences may need manual review before dubbing

### Issue: Dubbed Audio Sounds Rushed

- Increase `max_speed_factor` in `/dub-video` (currently 1.3x max)
- Consider splitting long segments into shorter ones
- Trade-off: Faster playback vs. audio quality

---

## Development Roadmap

### Phase 1 (Current) ✓

- Core ASR, Translation, TTS pipeline
- Subtitle generation & burning
- Basic dubbing with speed adjustment

### Phase 2 (Future)

- [ ] Frontend web UI (React)
- [ ] Batch job processing
- [ ] Advanced lip-sync (optional)
- [ ] Additional languages (Bengali, Tamil, etc.)
- [ ] Audio normalization & enhancement
- [ ] Background music separation

### Phase 3 (Future)

- [ ] GPU support (CUDA/ROCm)
- [ ] Distributed processing (workers)
- [ ] Cloud storage integration (S3, GCP)
- [ ] WebRTC streaming for live translation
- [ ] Custom voice training

---

## Architecture Principles for Extension

### Adding a New Language

1. Check IndicTrans2 supported languages: [Hugging Face](https://huggingface.co/ai4bharat)
2. Update `LANG_CODES` in `core/translate.py`
3. Add MMS-TTS model in `core/tts.py`
4. Update `app.py` `WHISPER_LANG_HINTS`
5. Test all endpoints with new language

### Swapping ASR/TTS Model

1. Modify model loading in respective module
2. Ensure output format matches expected schema
3. Update performance estimates in docs
4. Test end-to-end pipeline

### Adding Lip-Sync

1. Extract video frames in `core/av_utils.py`
2. Compute face landmarks & mouth regions
3. Use audio wave envelope to adjust segment timing
4. Regenerate dubbed audio with adjusted timestamps
5. Integrate into `/dub-video` workflow

---

## References & Resources

### Model Documentation

- **IndicTrans2**: https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M
- **Faster-Whisper**: https://github.com/guillaumekln/faster-whisper
- **Facebook MMS-TTS**: https://huggingface.co/facebook/mms-tts-eng

### Technologies

- **FastAPI**: https://fastapi.tiangolo.com
- **PyDub**: https://github.com/jiaaro/pydub
- **FFmpeg**: https://ffmpeg.org

### Papers

- IndicTrans2: Towards High-Quality and Accessible Machine Translation for Indian Languages
- Attention Is All You Need (Transformer architecture)
- MMS: Massive Multilingual Speech (Facebook)

---

## License & Attribution

This project is built for NGO accessibility. Respect all model licenses:

- **IndicTrans2**: AI4Bharat (Open Source)
- **Faster-Whisper**: MIT
- **MMS-TTS**: Meta CC-BY-NC 4.0 (non-commercial)

---

## Contributing & Support

### For Questions:

1. Check troubleshooting section above
2. Review API documentation at `/docs` endpoint
3. Run components standalone for debugging

### For Extensions:

1. Follow modular design in `core/` folder
2. Write standalone test scripts first
3. Integrate into app.py via new endpoints
4. Update this README with new features

---

**Last Updated**: 2026-08-16  
**Version**: 1.0 (Hackathon Release)
