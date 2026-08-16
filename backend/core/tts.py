"""
Phase 6 (Part B): Text-to-speech using Facebook MMS-TTS (VITS architecture).

CPU-friendly, one checkpoint per language, loads via transformers directly.

Run standalone to test:  python core/tts.py
"""

import torch
import scipy.io.wavfile
from transformers import VitsModel, AutoTokenizer

MODEL_NAMES = {
    "english": "facebook/mms-tts-eng",
    "hindi": "facebook/mms-tts-hin",
    "marathi": "facebook/mms-tts-mar",
}

_loaded = {}


def _load_model(language: str):
    language = language.lower()
    if language in _loaded:
        return _loaded[language]

    if language not in MODEL_NAMES:
        raise ValueError(f"Unsupported TTS language: {language}")

    model_name = MODEL_NAMES[language]
    print(f"Loading TTS model {model_name} (first run downloads it)...")

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = VitsModel.from_pretrained(model_name)
    model.eval()

    _loaded[language] = (tokenizer, model)
    return tokenizer, model


def synthesize(text: str, language: str, output_path: str) -> str:
    """
    Converts text into a .wav file using the given language's MMS-TTS model.
    Returns the output_path for convenience.
    """
    text = text.strip()
    if not text:
        raise ValueError("Cannot synthesize empty text")

    tokenizer, model = _load_model(language)

    inputs = tokenizer(text, return_tensors="pt")

    with torch.no_grad():
        output = model(**inputs).waveform

    # model.config.sampling_rate gives the correct rate for this checkpoint
    sample_rate = model.config.sampling_rate
    waveform = output.squeeze().cpu().numpy()

    scipy.io.wavfile.write(output_path, rate=sample_rate, data=waveform)
    return output_path


if __name__ == "__main__":
    synthesize("नमस्ते, आप कैसे हैं?", "hindi", "test_hindi.wav")
    print("Saved test_hindi.wav")

    synthesize("मला हा प्रकल्प खूप आवडतो.", "marathi", "test_marathi.wav")
    print("Saved test_marathi.wav")

    synthesize("Hello, how are you today?", "english", "test_english.wav")
    print("Saved test_english.wav")