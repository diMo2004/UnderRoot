import re
from typing import List
from google import genai
from config import GEMINI_API_KEY, GEMINI_MODEL

_USE_GEMINI = bool(GEMINI_API_KEY)
_client = genai.Client(api_key=GEMINI_API_KEY) if _USE_GEMINI else None


def _fallback_claims(text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text or "")
    claims = [s.strip() for s in sentences if len(s.strip()) > 20]
    seen = set()
    out = []
    for c in claims:
        k = c.lower()
        if k not in seen:
            seen.add(k)
            out.append(c)
    return out[:10]


def detect_claims(text: str) -> List[str]:
    if not text or not text.strip():
        return []

    if not _USE_GEMINI or _client is None:
        return _fallback_claims(text)

    prompt = (
        "You are a scientific writing assistant. Analyze the following text and identify "
        "sentences that are CITABLE_CLAIM (factual statements that need a citation). "
        "Ignore OPINION and GENERAL statements. "
        "Return only the citable claim sentences, one per line, with no extra text.\n\n"
        f"Text:\n{text}"
    )

    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL or "gemini-1.5-flash",
            contents=prompt,
        )
        raw = (resp.text or "").strip()
        claims = [line.strip(" -•\t") for line in raw.split("\n") if line.strip()]
        claims = [c for c in claims if len(c) > 10]
        return claims[:10] if claims else _fallback_claims(text)
    except Exception:
        return _fallback_claims(text)
