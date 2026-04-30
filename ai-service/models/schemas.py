from typing import List, Optional, Union, Any, Dict
from pydantic import BaseModel


class SourceEvidence(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    doi: Optional[str] = None
    year: Optional[int] = None
    provider: Optional[str] = None


class PlagiarismMatch(BaseModel):
    matched_text: str
    source: Union[SourceEvidence, str]
    similarity: float
    start_index: int
    end_index: int
    source_index: Optional[int] = None
    source_text: Optional[str] = None
    source_layer: Optional[str] = None
    candidate_source_indices: Optional[List[int]] = None
    top_sources: Optional[List[SourceEvidence]] = None

    # NEW (heatmap)
    risk_band: Optional[str] = None          # low|moderate|high|critical
    heatmap_color: Optional[str] = None      # hex color


class PlagiarismSection(BaseModel):
    section_title: str
    overall_score: float
    severity: str
    matches: List[PlagiarismMatch]


class PlagiarismRequest(BaseModel):
    text: str
    use_scholarly_sources: bool = True
    per_source_limit: int = 15


class PlagiarismResponse(BaseModel):
    overall_score: float
    severity: str
    sections: List[PlagiarismSection]
    checked_at: str

class CitationFormatSource(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    doi: Optional[str] = None
    year: Optional[int] = None
    provider: Optional[str] = None
    authors_str: Optional[List[str]] = None
    venue: Optional[str] = None


class CitationFormatRequest(BaseModel):
    style: str  # ieee|apa|acm
    source: CitationFormatSource
    index: int = 1


class CitationFormatResponse(BaseModel):
    citation_text: str
    style: str

class CitationRequest(BaseModel):
    text: str
    projectId: Optional[str] = None  # frontend sends camelCase


class CitationResponse(BaseModel):
    citations: List[Dict[str, Any]]
    claims_detected: List[str]

class SectionSummary(BaseModel):
    title: str
    summary: str


class SummaryRequest(BaseModel):
    text: str
    projectId: Optional[str] = None


class SummaryResponse(BaseModel):
    sectionSummaries: List[SectionSummary]
    abstractDraft: str