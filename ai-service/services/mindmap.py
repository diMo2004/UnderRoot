from google import genai
from config import GEMINI_API_KEY, GEMINI_MODEL

_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

def generate_mermaid_mindmap(text: str) -> str:
    """Generate a Mermaid.js mindmap syntax for the given text."""
    if _client is None:
        return "mindmap\n  root((Research Paper))\n    Error((API Key Missing))"

    prompt = (
        "Generate a Mermaid.js mindmap for the following research paper content. "
        "The mindmap should represent the logical structure and key concepts. "
        "Return ONLY the mermaid code starting with 'mindmap'.\n\n"
        f"Content:\n{text[:4000]}"
    )

    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL or "gemini-1.5-flash",
            contents=prompt,
        )
        out = (resp.text or "").strip()
        # Clean up in case the model includes markdown backticks
        if "```" in out:
            out = out.split("```")[1]
            if out.startswith("mermaid"):
                out = out[7:]
        return out.strip()
    except Exception as e:
        return f"mindmap\n  root((Error))\n    detail(({str(e)}))"
