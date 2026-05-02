from fastapi import APIRouter
from models.schemas import SummaryRequest
from services.mindmap import generate_mermaid_mindmap

router = APIRouter()

@router.post("/generate")
async def get_mindmap(request: SummaryRequest):
    mermaid_code = generate_mermaid_mindmap(request.text)
    return {"mermaid": mermaid_code}
