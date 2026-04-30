from typing import List, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer
from datetime import datetime
from config import RANKING_MODEL

_model = SentenceTransformer(RANKING_MODEL)
_CURRENT_YEAR = datetime.now().year


def _recency_score(year: int) -> float:
    age = max(0, _CURRENT_YEAR - year)
    return max(0.0, 1.0 - age / 20.0)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def rank_papers(claim: str, papers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Rank papers by a composite score: semantic + citations + recency + DOI."""
    if not papers:
        return papers

    claim_embedding = _model.encode(claim)

    max_citations = max((p.get("citationCount", 0) for p in papers), default=1) or 1

    scored = []
    for paper in papers:
        abstract = paper.get("abstract") or paper.get("title", "")
        paper_embedding = _model.encode(abstract)
        semantic = _cosine_similarity(claim_embedding, paper_embedding)

        citation_norm = min(paper.get("citationCount", 0) / max_citations, 1.0)
        recency = _recency_score(paper.get("year") or _CURRENT_YEAR)
        doi_bonus = 0.1 if paper.get("externalIds", {}).get("DOI") else 0.0

        composite = (
            0.5 * semantic
            + 0.25 * citation_norm
            + 0.15 * recency
            + 0.1 * doi_bonus
        )
        scored.append((composite, paper))

    scored.sort(key=lambda x: x[0], reverse=True)
    result = []
    for score, paper in scored:
        paper["relevance_score"] = round(score, 4)
        result.append(paper)
    return result
