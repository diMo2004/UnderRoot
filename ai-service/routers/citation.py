from fastapi import APIRouter, HTTPException
from models.schemas import (
    CitationRequest,
    CitationResponse,
    CitationFormatRequest,
    CitationFormatResponse,
)
from services.claim_detector import detect_claims
from services.citation_search import search_for_claim
from services.citation_ranker import rank_papers
from services.citation_formatter import normalize_paper, format_ieee, format_apa, format_acm

router = APIRouter()


@router.post("/suggest", response_model=CitationResponse)
async def suggest_citations(request: CitationRequest):
    claims = detect_claims(request.text)

    all_papers: dict = {}
    for claim in claims[:5]:
        raw_papers = search_for_claim(claim, limit=10)
        ranked = rank_papers(claim, raw_papers)
        for paper in ranked[:5]:
            pid = paper.get("paperId", "")
            if pid and pid not in all_papers:
                all_papers[pid] = paper

    normalized = [normalize_paper(p) for p in list(all_papers.values())[:10]]
    normalized.sort(key=lambda x: x.get("relevance_score", 0.0), reverse=True)

    return CitationResponse(citations=normalized, claims_detected=claims)


@router.post("/format", response_model=CitationFormatResponse)
async def format_citation(request: CitationFormatRequest):
    style = (request.style or "").lower().strip()
    paper = request.source.model_dump()

    try:
        if style == "ieee":
            txt = format_ieee(paper)
        elif style == "apa":
            txt = format_apa(paper)
        elif style == "acm":
            txt = format_acm(paper)
        else:
            raise HTTPException(status_code=400, detail="Unsupported style. Use ieee, apa, acm.")

        return CitationFormatResponse(citation_text=txt, style=style)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to format citation: {e}")