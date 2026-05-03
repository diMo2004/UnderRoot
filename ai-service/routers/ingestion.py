from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from services.knowledge_base import kb

router = APIRouter()

class IngestRequest(BaseModel):
    title: str
    text: str
    url: Optional[str] = ""

@router.post("/ingest")
async def ingest_paper(request: IngestRequest, background_tasks: BackgroundTasks):
    if not request.text or not request.title:
        raise HTTPException(status_code=400, detail="Title and text are required")
    
    # We can run ingestion in background to avoid blocking the API
    count = kb.ingest_paper(request.title, request.text, request.url)
    
    return {
        "status": "success",
        "message": f"Successfully ingested paper '{request.title}'",
        "sentences_added": count
    }

@router.get("/status")
async def get_status():
    return {
        "sentences_count": kb.index.ntotal if kb.index else 0
    }
