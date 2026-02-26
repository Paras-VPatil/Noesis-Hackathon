from pydantic import BaseModel
from typing import List, Optional

class QARequest(BaseModel):
    subjectId: str
    query: str
    sessionId: Optional[str] = None

class Citation(BaseModel):
    fileName: str
    locationRef: str
    chunkId: str
    sourceFormat: str

class QAResponse(BaseModel):
    answer: str
    confidenceTier: str
    confidenceScore: float
    citations: List[Citation]
    evidenceSnippets: List[str]
    sessionId: Optional[str] = None
