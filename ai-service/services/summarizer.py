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
        print("AI Service: Gemini client not initialized (missing API key)")
        return ""
    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL or "gemini-2.0-flash",
            contents=prompt,
        )
        
        try:
            text = (resp.text or "").strip()
        except Exception:
            text = ""
            
        if not text:
            print(f"AI Service: Gemini returned empty response. Prompt length: {len(prompt)}")
            if resp.candidates:
                candidate = resp.candidates[0]
                print(f"AI Service: Candidate 0 finish reason: {candidate.finish_reason}")
                if candidate.safety_ratings:
                    print(f"AI Service: Safety ratings: {candidate.safety_ratings}")
            elif hasattr(resp, 'prompt_feedback'):
                print(f"AI Service: Prompt feedback: {resp.prompt_feedback}")
        return text
    except Exception as e:
        print(f"AI Service: Gemini Error (Type: {type(e).__name__}): {e}")
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


def rewrite_text(text: str, format_style: str = None) -> str:
    style_guide = ""
    if format_style == "IEEE":
        style_guide = "Use IEEE standards: objective, technical, and concise. Use passive voice for methodology. Ensure engineering precision."
    elif format_style == "APA":
        style_guide = "Use APA standards: clear, direct, and objective. Suitable for social and behavioral sciences."
    elif format_style == "ACM":
        style_guide = "Use ACM standards: formal, precise, and computing-focused."
    
    prompt = (
        f"Rewrite the following text to improve academic clarity, flow, and professional tone. {style_guide}\n"
        "Maintain the original meaning and approximate length. Fix any grammatical issues.\n"
        "CRITICAL: If the text contains broken line breaks or copy-paste artifacts, fix them first.\n\n"
        f"{text}"
    )
    return _gen(prompt)


def _basic_clean(text: str) -> str:
    """Fallback regex cleaner for when AI fails."""
    # Fix broken line breaks (mid-sentence)
    text = re.sub(r'(?<=[a-z])\n(?=[a-z])', ' ', text)
    # Fix hyphenation artifacts
    text = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)
    # Fix missing spaces (e.g. "thisisatest" -> no, this is hard with regex, 
    # but we can fix multiple spaces and newlines)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def proofread_text(text: str) -> str:
    prompt = (
        "Clean and proofread the following academic text which was copied from a PDF/Document. Fix these specific issues:\n"
        "1. REMOVE random line breaks, especially mid-sentence or mid-word.\n"
        "2. FIX hyphenation (e.g., 'trans- action' should be 'transaction').\n"
        "3. RESOLVE spacing issues (missing spaces between words or double spaces).\n"
        "4. CORRECT minor OCR errors.\n"
        "Ensure the output is one continuous, clean academic paragraph/text while preserving all technical terminology.\n\n"
        f"{text}"
    )
    out = _gen(prompt)
    if not out:
        print("AI Service: Proofread fallback triggered.")
        return _basic_clean(text)
    return out
