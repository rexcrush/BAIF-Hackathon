"""
Phase 1: Standalone IndicTrans2 translation module.

Run this file directly to sanity-check translation quality before
wiring it into FastAPI:  python core/translate.py
"""

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor
import torch

# ---- Supported languages for this app (extend later if needed) ----
LANG_CODES = {
    "english": "eng_Latn",
    "hindi": "hin_Deva",
    "marathi": "mar_Deva",
}

# ---- Model checkpoints by direction ----
MODEL_NAMES = {
    "en-indic": "ai4bharat/indictrans2-en-indic-dist-200M",
    "indic-en": "ai4bharat/indictrans2-indic-en-dist-200M",
    "indic-indic": "ai4bharat/indictrans2-indic-indic-dist-320M",
}

# Cache of loaded models so we don't reload from disk on every call
_loaded = {}


def _get_direction(src: str, tgt: str) -> str:
    if src == "english":
        return "en-indic"
    if tgt == "english":
        return "indic-en"
    return "indic-indic"


def _load_model(direction: str):
    if direction in _loaded:
        return _loaded[direction]

    model_name = MODEL_NAMES[direction]
    print(f"Loading {model_name} (first run will download the model, be patient)...")

    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_name,
        trust_remote_code=True,
        torch_dtype=torch.float32,  # CPU-friendly
    )
    model.eval()

    _loaded[direction] = (tokenizer, model)
    return tokenizer, model

def _clean_text(text: str) -> str:
    """Strip corrupted/replacement characters that can come from imperfect ASR output."""
    text = text.replace("\ufffd", "")  # the "�" replacement character
    text = " ".join(text.split())      # collapse repeated whitespace
    return text.strip()


def translate(text: str, source_lang: str, target_lang: str) -> str:
    """
    text: input sentence or paragraph
    source_lang / target_lang: one of "english", "hindi", "marathi"
    """
    source_lang = source_lang.lower()
    target_lang = target_lang.lower()
    text = _clean_text(text)

    if not text:
        return ""

    if source_lang == target_lang:
        return text

    if source_lang not in LANG_CODES or target_lang not in LANG_CODES:
        raise ValueError(f"Unsupported language pair: {source_lang} -> {target_lang}")

    direction = _get_direction(source_lang, target_lang)
    tokenizer, model = _load_model(direction)

    ip = IndicProcessor(inference=True)

    src_code = LANG_CODES[source_lang]
    tgt_code = LANG_CODES[target_lang]

    batch = ip.preprocess_batch([text], src_lang=src_code, tgt_lang=tgt_code)

    inputs = tokenizer(
        batch,
        truncation=True,
        padding="longest",
        return_tensors="pt",
    )

    with torch.no_grad():
        generated_tokens = model.generate(
            **inputs,
            max_length=256,
            num_beams=5,
            num_return_sequences=1,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            early_stopping=True,
        )

    decoded = tokenizer.batch_decode(
        generated_tokens,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True,
    )

    translations = ip.postprocess_batch(decoded, lang=tgt_code)
    return translations[0]


if __name__ == "__main__":
    # Quick manual sanity checks — run this file directly to test.
    tests = [
        ("Hello, how are you? I hope your work is going well.", "english", "hindi"),
        ("मुझे यह प्रोजेक्ट बहुत पसंद है।", "hindi", "english"),
        ("मुझे यह प्रोजेक्ट बहुत पसंद है।", "hindi", "marathi"),
    ]

    for text, src, tgt in tests:
        result = translate(text, src, tgt)
        print(f"\n[{src} -> {tgt}]")
        print(f"  IN:  {text}")
        print(f"  OUT: {result}")