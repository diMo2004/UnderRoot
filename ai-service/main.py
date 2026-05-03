import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import citation, plagiarism, summary, mindmap, ingestion

app = FastAPI(
    title="UnderRoot AI Service",
    version="0.1.0",
    description="AI-powered citation suggestions, plagiarism detection, summarization, and mind mapping for UnderRoot.",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(citation.router, prefix="/api/citations", tags=["citations"])
app.include_router(plagiarism.router, prefix="/api/plagiarism", tags=["plagiarism"])
app.include_router(summary.router, prefix="/api/summary", tags=["summary"])
app.include_router(mindmap.router, prefix="/api/mindmap", tags=["mindmap"])
app.include_router(ingestion.router, prefix="/api/ingest", tags=["ingest"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "underroot-ai-service"}