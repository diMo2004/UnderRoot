from fastapi import APIRouter
from models.schemas import SummaryRequest, SummaryResponse, SectionSummary, RewriteRequest, RewriteResponse
from services.summarizer import _split_sections, summarize_section, draft_abstract, rewrite_text, proofread_text

router = APIRouter()


@router.post("/generate", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    sections = _split_sections(request.text)
    section_summaries = []
    for title, content in sections:
        if content.strip():
            summary = summarize_section(title, content)
            section_summaries.append(SectionSummary(title=title, summary=summary))

    abstract = draft_abstract(request.text)

    return SummaryResponse(
        sectionSummaries=section_summaries,
        abstractDraft=abstract,
    )


@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite(request: RewriteRequest):
    rewritten = rewrite_text(request.text, request.format)
    return RewriteResponse(rewrittenText=rewritten)


@router.post("/proofread", response_model=RewriteResponse)
async def proofread(request: RewriteRequest):
    rewritten = proofread_text(request.text)
    return RewriteResponse(rewrittenText=rewritten)
