import re
from datetime import datetime, timezone
from hashlib import sha256
from typing import List, Dict, Any
from fastapi import APIRouter
from models.schemas import PlagiarismRequest, PlagiarismResponse
from services.plagiarism_lexical import check_lexical
from services.plagiarism_semantic import build_semantic_runtime, check_semantic_with_runtime
from services.plagiarism_structural import check_structural
from services.plagiarism_aggregator import build_section_result
from services.query_builder import build_query_from_text
from services.domain_topics import build_domain_query, is_domain_relevant
from services.scholarly_sources import build_multi_source_records_async
from services.runtime_cache import get_cached, set_cached

router = APIRouter()

_HEADING_RE = re.compile(
    r"^(abstract|introduction|related work|methodology|results|discussion|conclusion)",
    re.IGNORECASE,
)

CACHE_TTL_SECONDS = 15 * 60  # 15 minutes


def _split_sections(text: str):
    """Split text into (section_title, sentences) pairs."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    sections = []
    current_title = "Document"
    current_sentences: list = []

    for para in paragraphs:
        first_line = para.split("\n")[0].strip()
        if _HEADING_RE.match(first_line) and len(first_line) < 60:
            if current_sentences:
                sections.append((current_title, current_sentences))
            current_title = first_line
            current_sentences = []
        else:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            current_sentences.extend([s.strip() for s in sentences if s.strip()])

    if current_sentences:
        sections.append((current_title, current_sentences))

    return sections if sections else [("Document", [text])]


_FALLBACK_CORPUS = [
    "Machine learning is a subfield of artificial intelligence.",
    "Deep learning models require large amounts of training data.",
    "Neural networks are inspired by the human brain.",
]


def _record_to_text(r: Dict[str, Any]) -> str:
    title = (r.get("title") or "").strip()
    abstract = (r.get("abstract") or "").strip()
    if title and abstract:
        return f"{title}. {abstract}"
    return title or abstract


def _cache_key_from_query(domain_q: str, per_source_limit: int) -> str:
    raw = f"{domain_q}|limit={per_source_limit}"
    return "plagiarism:scholarly:" + sha256(raw.encode("utf-8")).hexdigest()


def _attach_evidence(section_results, records, top_k: int = 3):
    if not records:
        return section_results

    for sec in section_results:
        matches = sec.get("matches", [])
        for m in matches:
            # primary source
            idx = m.get("source_index")
            if isinstance(idx, int) and 0 <= idx < len(records):
                src = records[idx]
                m["source"] = {
                    "title": src.get("title"),
                    "url": src.get("url"),
                    "doi": src.get("doi"),
                    "year": src.get("year"),
                    "provider": src.get("source"),
                }

            # top-k
            top_sources = []
            for cidx in (m.get("candidate_source_indices") or [])[:top_k]:
                if isinstance(cidx, int) and 0 <= cidx < len(records):
                    s = records[cidx]
                    top_sources.append({
                        "title": s.get("title"),
                        "url": s.get("url"),
                        "doi": s.get("doi"),
                        "year": s.get("year"),
                        "provider": s.get("source"),
                    })
            m["top_sources"] = top_sources

    return section_results


@router.post("/check", response_model=PlagiarismResponse)
async def check_plagiarism(request: PlagiarismRequest):
    sections = _split_sections(request.text)
    section_results = []

    corpus: List[str] = []
    records: List[Dict[str, Any]] = []
    semantic_runtime = None

    if getattr(request, "use_scholarly_sources", True):
        base_q = build_query_from_text(request.text, top_n=12)
        domain_q = build_domain_query(base_q)
        per_source_limit = getattr(request, "per_source_limit", 15)

        cache_key = _cache_key_from_query(domain_q, per_source_limit)
        cached_bundle = get_cached(cache_key, ttl_seconds=CACHE_TTL_SECONDS)

        if cached_bundle:
            records = cached_bundle.get("records", [])
            corpus = cached_bundle.get("corpus", [])
            semantic_runtime = cached_bundle.get("semantic_runtime", None)
        else:
            records = await build_multi_source_records_async(domain_q, per_source_limit=per_source_limit)

            # domain filter (defense in depth)
            records = [
                r for r in records
                if is_domain_relevant(f"{r.get('title','')}. {r.get('abstract','')}")
            ]

            corpus = [_record_to_text(r) for r in records if len(_record_to_text(r)) > 40]

            if corpus:
                semantic_runtime = build_semantic_runtime(corpus)

            set_cached(cache_key, {
                "records": records,
                "corpus": corpus,
                "semantic_runtime": semantic_runtime,
            })

    if not corpus:
        corpus = _FALLBACK_CORPUS
        records = []
        semantic_runtime = build_semantic_runtime(corpus)

    for title, sentences in sections:
        if not sentences:
            continue

        lex = check_lexical(sentences, corpus)

        sem = (
            check_semantic_with_runtime(sentences, semantic_runtime)
            if semantic_runtime is not None
            else [{"score": 0.0, "source_index": -1, "source_text": ""} for _ in sentences]
        )

        struct = check_structural(sentences, corpus)

        section_results.append(build_section_result(title, sentences, lex, sem, struct))

    section_results = _attach_evidence(section_results, records, top_k=3)

    overall = (
        sum(s["overall_score"] for s in section_results) / len(section_results)
        if section_results else 0.0
    )

    if overall < 0.15:
        sev_label = "low"
    elif overall < 0.25:
        sev_label = "moderate"
    elif overall < 0.40:
        sev_label = "high"
    else:
        sev_label = "critical"

    return PlagiarismResponse(
        overall_score=round(overall, 4),
        severity=sev_label,
        sections=section_results,
        checked_at=datetime.now(timezone.utc).isoformat(),
    )
