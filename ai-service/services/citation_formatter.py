from typing import Dict, Any, Optional
import requests

_DOI_BASE = "https://doi.org/"


def verify_doi(doi: str) -> bool:
    """Verify that a DOI resolves."""
    try:
        resp = requests.head(f"{_DOI_BASE}{doi}", timeout=5, allow_redirects=True)
        return resp.status_code < 400
    except Exception:
        return False


def format_ieee(paper: Dict[str, Any]) -> str:
    authors_list = paper.get("authors_str") or paper.get("authors") or []
    authors = ", ".join(authors_list) if isinstance(authors_list, list) else str(authors_list)
    title = paper.get("title", "")
    venue = paper.get("venue", "")
    year = paper.get("year", "")
    doi = paper.get("doi", "")
    doi_str = f", doi: {doi}" if doi else ""
    return f'{authors}, "{title}," {venue}, {year}{doi_str}.'


def format_apa(paper: Dict[str, Any]) -> str:
    authors = ", ".join(paper.get("authors_str", []))
    year = paper.get("year", "n.d.")
    title = paper.get("title", "")
    venue = paper.get("venue", "")
    doi = paper.get("doi", "")
    doi_str = f" https://doi.org/{doi}" if doi else ""
    return f"{authors} ({year}). {title}. {venue}.{doi_str}"


def format_acm(paper: Dict[str, Any]) -> str:
    authors = ", ".join(paper.get("authors_str", []))
    year = paper.get("year", "")
    title = paper.get("title", "")
    venue = paper.get("venue", "")
    doi = paper.get("doi", "")
    doi_str = f" DOI: https://doi.org/{doi}" if doi else ""
    return f"{authors}. {year}. {title}. In {venue}.{doi_str}"


def normalize_paper(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a Semantic Scholar paper dict into our schema."""
    doi = raw.get("externalIds", {}).get("DOI")
    authors = [a.get("name", "") for a in raw.get("authors", [])]
    return {
        "paper_id": raw.get("paperId", ""),
        "title": raw.get("title", ""),
        "authors": authors,
        "authors_str": authors,  # <-- add this line
        "year": raw.get("year") or 0,
        "venue": raw.get("venue") or "",
        "citation_count": raw.get("citationCount") or 0,
        "relevance_score": raw.get("relevance_score", 0.0),
        "doi": doi,
        "url": f"https://www.semanticscholar.org/paper/{raw.get('paperId', '')}",
        "abstract": raw.get("abstract"),
    }
