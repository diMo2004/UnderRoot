from typing import List, Tuple
import re
from google import genai
from config import GEMINI_API_KEY, GEMINI_MODEL

_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def _split_sections(text: str) -> List[Tuple[str, str]]:
    """Split text into (title, content) pairs."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    sections = []
    current_title = "Document"
    current_content: List[str] = []

    heading_re = re.compile(
        r"^(abstract|introduction|related work|methodology|results|discussion|conclusion|\d+\.)",
        re.IGNORECASE,
    )

    for para in paragraphs:
        first_line = para.split("\n")[0].strip()
        if heading_re.match(first_line) and len(first_line) < 80:
            if current_content:
                sections.append((current_title, "\n".join(current_content).strip()))
            current_title = first_line
            remaining = para[len(first_line):].strip()
            current_content = [remaining] if remaining else []
        else:
            current_content.append(para)

    if current_content:
        sections.append((current_title, "\n".join(current_content).strip()))

    return sections or [("Document", text)]


def _gen(prompt: str) -> str:
    if _client is None:
        return ""
    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL or "gemini-1.5-flash",
            contents=prompt,
        )
        return (resp.text or "").strip()
    except Exception:
        return ""


def summarize_section(title: str, content: str) -> str:
    prompt = (
        f"Summarize the following '{title}' section of a research paper in 2-3 concise sentences:\n\n{content}"
    )
    out = _gen(prompt)
    return out if out else (content[:200] + "…")


def draft_abstract(text: str) -> str:
    prompt = (
        "Based on the following research paper content, write a concise abstract "
        "(150-250 words) covering: background, objective, methods, results, and conclusion.\n\n"
        f"{text[:3000]}"
    )
    out = _gen(prompt)
    return out if out else "Abstract could not be generated."
