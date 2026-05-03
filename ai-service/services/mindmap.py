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
        if "```" in out:
            out = out.split("```")[1]
            if out.startswith("mermaid"):
                out = out[7:]
        return out.strip()
    except Exception as e:
        return f"mindmap\n  root((Error))\n    detail(({str(e)}))"

def generate_json_mindmap(text: str) -> dict:
    """Generate a hierarchical JSON mindmap for the given text."""
    if _client is None:
        return {"id": "root", "label": "Error", "children": [{"id": "err", "label": "API Key Missing", "children": []}]}

    prompt = (
        "Analyze the following research paper content and generate a hierarchical mind map in JSON format. "
        "Structure: {\"id\": \"root\", \"label\": \"Main Topic\", \"children\": [{\"id\": \"b1\", \"label\": \"Branch\", \"children\": []}]}. "
        "Maximum 5 branches and 3 leaves per branch. Return ONLY valid JSON.\n\n"
        f"Content:\n{text[:4000]}"
    )

    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL or "gemini-1.5-flash",
            contents=prompt,
        )
        out = (resp.text or "").strip()
        if "```" in out:
            out = out.split("```")[1]
            if out.startswith("json"):
                out = out[4:]
        import json
        return json.loads(out.strip())
    except Exception as e:
        return {"id": "root", "label": "Error", "children": [{"id": "err", "label": str(e), "children": []}]}
