from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
import requests
import asyncio

from config import SEMANTIC_SCHOLAR_API_KEY
from services.scholarly_sources import build_multi_source_records_async

_SS_BASE = "https://api.semanticscholar.org/graph/v1"
_SS_FIELDS = "paperId,title,authors,year,venue,citationCount,externalIds,abstract"


def extract_keywords(claim: str, top_n: int = 5) -> str:
    """Extract key terms from a claim using TF-IDF."""
    try:
        vectorizer = TfidfVectorizer(stop_words="english", max_features=top_n)
        vectorizer.fit_transform([claim])
        return " ".join(vectorizer.get_feature_names_out())
    except Exception:
        return claim[:100]


def _records_to_papers(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Map scholarly_sources records -> SemanticScholar-like paper dict
    so existing ranker/formatter/normalize_paper keeps working.
    """
    out: List[Dict[str, Any]] = []
    for r in records:
        title = (r.get("title") or "").strip()
        if not title:
            continue

        src = (r.get("source") or "external").strip()
        url = (r.get("url") or "").strip()
        doi = (r.get("doi") or "").strip()

        # make a stable-ish id for dedupe in routers/citation.py (uses paper.get("paperId"))
        paper_id = ""
        if doi:
            paper_id = f"DOI:{doi.lower()}"
        elif url:
            paper_id = f"URL:{url.lower()}"
        else:
            paper_id = f"TITLE:{title.lower()}"

        out.append(
            {
                "paperId": paper_id,
                "title": title,
                "authors": [],          # not available in current scholarly_sources
                "year": r.get("year"),
                "venue": src,           # best-effort
                "citationCount": 0,
                "externalIds": {"DOI": doi} if doi else {},
                "abstract": r.get("abstract") or "",
                "url": url,
                "_provider": src,       # optional debug field
            }
        )
    return out


def search_papers(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Query Semantic Scholar for papers matching the query. Fallback to OpenAlex/Crossref/arXiv."""
    headers = {}
    if SEMANTIC_SCHOLAR_API_KEY:
        headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY

    papers: List[Dict[str, Any]] = []

    # 1) Try Semantic Scholar first
    try:
        resp = requests.get(
            f"{_SS_BASE}/paper/search",
            params={"query": query, "limit": limit, "fields": _SS_FIELDS},
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        papers = resp.json().get("data", []) or []
    except Exception:
        papers = []
    return papers
    
async def search_papers_fallback_async(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    records = await build_multi_source_records_async(query, per_source_limit=min(limit, 15))
    return _records_to_papers(records)[:limit]

async def search_for_claim_async(claim: str, limit: int = 10) -> List[Dict[str, Any]]:
    from services.knowledge_base import kb
    keywords = extract_keywords(claim)

    # 1) Try Local KB first
    local_papers = kb.search([claim], top_k=5)
    if local_papers:
        external_papers = search_papers(keywords, limit=limit // 2)
        return (local_papers + external_papers)[:limit]

    # 2) Fallback to S2
    papers = search_papers(keywords, limit=limit)
    if papers:
        return papers

    # 3) Fallback using the raw claim
    return await search_papers_fallback_async(claim, limit=limit)