import asyncio
import random
from typing import List, Dict, Any, Optional, Callable, Awaitable
import httpx

MAX_PER_SOURCE = 50
REQUEST_TIMEOUT = 25.0
MAX_RETRIES = 3
BASE_BACKOFF = 0.8
MAX_CONCURRENCY = 4


# -----------------------------
# Text cleanup
# -----------------------------
def _clean_text(s: str) -> str:
    if not s:
        return ""
    replacements = {
        "â€“": "-",
        "â€”": "-",
        "â€˜": "'",
        "â€™": "'",
        "â€œ": '"',
        "â€\x9d": '"',
        "â€¦": "...",
        "â†’": "->",
        "âOutput": "-Output",
        "âoutput": "-output",
    }
    for bad, good in replacements.items():
        s = s.replace(bad, good)
    return " ".join(s.split())


def _norm_item(
    *,
    title: str,
    abstract: str = "",
    url: str = "",
    doi: str = "",
    year: Optional[int] = None,
    source: str = "",
    authors: Optional[List[str]] = None,
) -> Dict[str, Any]:
    return {
        "title": _clean_text((title or "").strip()),
        "abstract": _clean_text((abstract or "").strip()),
        "url": (url or "").strip(),
        "doi": (doi or "").strip(),
        "year": year,
        "source": source,
        "authors": authors or [],
    }


def _dedupe(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for it in items:
        key = (
            (it.get("doi") or "").lower().strip()
            or (it.get("url") or "").lower().strip()
            or (it.get("title") or "").lower().strip()
        )
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


def _is_retryable_status(code: int) -> bool:
    return code == 429 or 500 <= code < 600


async def _with_retries(
    op_name: str,
    fn: Callable[[], Awaitable[List[Dict[str, Any]]]],
) -> List[Dict[str, Any]]:
    last_err = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return await fn()
        except httpx.HTTPStatusError as e:
            last_err = e
            code = e.response.status_code if e.response is not None else 0
            if not _is_retryable_status(code) or attempt == MAX_RETRIES:
                break
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last_err = e
            if attempt == MAX_RETRIES:
                break
        except Exception as e:
            last_err = e
            if attempt == MAX_RETRIES:
                break

        backoff = BASE_BACKOFF * (2 ** attempt) + random.uniform(0, 0.25)
        await asyncio.sleep(backoff)

    # soft-fail one source, do not crash full pipeline
    return []


async def _bounded_call(
    sem: asyncio.Semaphore,
    op_name: str,
    fn: Callable[[], Awaitable[List[Dict[str, Any]]]],
) -> List[Dict[str, Any]]:
    async with sem:
        return await _with_retries(op_name, fn)


# -----------------------------
# Source fetchers
# -----------------------------
async def _fetch_openalex(client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
    url = "https://api.openalex.org/works"
    params = {"search": query, "per-page": limit, "sort": "relevance_score:desc"}
    r = await client.get(url, params=params, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    rows = (r.json() or {}).get("results", []) or []

    out = []
    for w in rows:
        # Extract authors from authorships
        authors = []
        for authorship in (w.get("authorships") or []):
            name = (authorship.get("author") or {}).get("display_name", "").strip()
            if name:
                authors.append(name)
        out.append(
            _norm_item(
                title=w.get("title") or w.get("display_name") or "",
                abstract="",
                url=w.get("id") or "",
                doi=w.get("doi") or "",
                year=w.get("publication_year"),
                source="openalex",
                authors=authors,
            )
        )
    return out


async def _fetch_crossref(client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
    url = "https://api.crossref.org/works"
    params = {"query": query, "rows": limit, "sort": "relevance", "order": "desc"}
    r = await client.get(url, params=params, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    rows = (r.json() or {}).get("message", {}).get("items", []) or []

    out = []
    for w in rows:
        title = (w.get("title") or [""])[0] if isinstance(w.get("title"), list) else (w.get("title") or "")
        abstract = w.get("abstract") or ""
        doi = w.get("DOI") or ""
        issued = w.get("issued", {}).get("date-parts", [])
        year = issued[0][0] if issued and issued[0] else None
        url_ = w.get("URL") or (f"https://doi.org/{doi}" if doi else "")
        # Extract authors from CrossRef author array
        authors = []
        for a in (w.get("author") or []):
            given = (a.get("given") or "").strip()
            family = (a.get("family") or "").strip()
            name = f"{given} {family}".strip()
            if name:
                authors.append(name)
        out.append(_norm_item(title=title, abstract=abstract, url=url_, doi=doi, year=year, source="crossref", authors=authors))
    return out


async def _fetch_arxiv(client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
    url = "http://export.arxiv.org/api/query"
    params = {"search_query": f"all:{query}", "start": 0, "max_results": limit}
    r = await client.get(url, params=params, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    text = r.text or ""

    entries = text.split("<entry>")[1:]
    out = []

    for e in entries:
        def _tag(tag: str) -> str:
            a = e.find(f"<{tag}>")
            b = e.find(f"</{tag}>")
            if a == -1 or b == -1:
                return ""
            return e[a + len(tag) + 2:b].strip()

        title = _tag("title")
        abstract = _tag("summary")
        url_ = _tag("id")
        published = _tag("published")
        year = int(published[:4]) if len(published) >= 4 and published[:4].isdigit() else None
        # Extract authors from arXiv <author><name> tags
        authors = []
        author_blocks = e.split("<author>")[1:]
        for ab in author_blocks:
            name_start = ab.find("<name>")
            name_end = ab.find("</name>")
            if name_start != -1 and name_end != -1:
                name = ab[name_start + 6:name_end].strip()
                if name:
                    authors.append(name)
        out.append(_norm_item(title=title, abstract=abstract, url=url_, doi="", year=year, source="arxiv", authors=authors))

    return out


async def _fetch_semantic_scholar(client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {"query": query, "limit": limit, "fields": "title,authors,abstract,year,url,externalIds"}
    r = await client.get(url, params=params, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    rows = (r.json() or {}).get("data", []) or []

    out = []
    for p in rows:
        ext = p.get("externalIds") or {}
        doi = ext.get("DOI") or ""
        # Extract authors from Semantic Scholar
        authors = [a.get("name", "").strip() for a in (p.get("authors") or []) if a.get("name", "").strip()]
        out.append(
            _norm_item(
                title=p.get("title") or "",
                abstract=p.get("abstract") or "",
                url=p.get("url") or (f"https://doi.org/{doi}" if doi else ""),
                doi=doi,
                year=p.get("year"),
                source="semantic_scholar",
                authors=authors,
            )
        )
    return out


# -----------------------------
# Public API
# -----------------------------
async def build_multi_source_records_async(query: str, per_source_limit: int = 15) -> List[Dict[str, Any]]:
    limit = max(1, min(per_source_limit, MAX_PER_SOURCE))
    sem = asyncio.Semaphore(MAX_CONCURRENCY)

    headers = {"User-Agent": "UnderRoot-AI-Service/1.0 (scholarly-fetcher)"}
    async with httpx.AsyncClient(headers=headers) as client:
        tasks = [
            _bounded_call(sem, "openalex", lambda: _fetch_openalex(client, query, limit)),
            _bounded_call(sem, "crossref", lambda: _fetch_crossref(client, query, limit)),
            _bounded_call(sem, "arxiv", lambda: _fetch_arxiv(client, query, limit)),
            _bounded_call(sem, "semantic_scholar", lambda: _fetch_semantic_scholar(client, query, limit)),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=False)

    merged: List[Dict[str, Any]] = []
    for source_items in results:
        merged.extend(source_items)

    merged = [x for x in merged if (x.get("title") or "").strip()]
    return _dedupe(merged)